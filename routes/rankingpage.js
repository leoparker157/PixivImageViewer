const isAuthenticated = require('../middleware/isAuthenticated'); // Import the middleware
const activeTabs = {};
async function RankingPage(fastify, request) {
  fastify.addHook('preHandler', isAuthenticated)
  const { v4: uuidv4 } = require('uuid');
  const {axios,fs,path,sanitize} = require('../services/initialsetup.js');
  const {getRankingIllusts} = require('../services/mainFunction.js');
  const checkAndRenamefile= require('../services/otherFunction.js');

  // Check if there is an active socket connection

  


  /**
   * Returns the path of the folder where the downloaded ranking illusts are stored.
   * If the folder doesn't exist, it creates it.
   *
   * @returns {string} The path of the downloads folder.
   */
  const getDownloadsFolder = () => {
    const folderPath = path.join(__dirname, '..', 'image','Ranking Illusts');// Modify this folder structure as needed
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    return folderPath;
  };

  /**
   * Downloads an image from a given URL and saves it to a file path.
   * @param {string} url_medium - The URL of the image to download.
   * @param {string} filePath - The file path to save the downloaded image to.
   * @param {Object} Pixiv - The Pixiv object containing the getAxiosImageStream method.
   * @returns {Promise<void>} - A Promise that resolves when the image is downloaded and saved.
   */
  const downloadImage = async (url_medium, filePath,Pixiv) => {
    if (!fs.existsSync(filePath)) {
      const imageStreamResponse = await Pixiv.getAxiosImageStream(url_medium);
      const waitingdone = imageStreamResponse.data.pipe(fs.createWriteStream(filePath));
      await new Promise((resolve) => waitingdone.on('finish', resolve));
    }
  };

  /**
   * Processes an illustration object and downloads the image.
   * @param {Object} illustration - The illustration object to process.
   * @param {Object} Pixiv - The Pixiv object to use for downloading.
   * @param {number} index - The index of the illustration in the ranking.
   * @param {string} downloadsFolder - The path to the downloads folder.
   * @param {string} usersocketID - The ID of the user's socket.
   * @returns {Promise} A promise that resolves when the image is downloaded.
   */
  const processIllustration = async (illustration, Pixiv, index, downloadsFolder, usersocketID) => {
    const illustId = illustration.id;
    const title = illustration.title;
    const total_bookmarks = illustration.total_bookmarks;
    filenames=[];
    if (illustration.page_count > 1) {
      const pages = illustration.meta_pages.map((page, pageIndex) => {
        const pageSafeTitle = sanitize(`${title}_id:${illustId}_page${pageIndex + 1}`);
        filenames.push(`${pageSafeTitle}.jpg`); // Add filename to array
        const pageFilePath = path.join(downloadsFolder, `${pageSafeTitle}.jpg`);
        return { url: page.image_urls.medium, filePath: pageFilePath };
      });
      illustration.filename = filenames; // Assign filenames array to illustration
      const downloadPromises = pages.map(async (page, pageIndex) => {
        await downloadImage(page.url, page.filePath, Pixiv);
      });
      await fastify.io.to(usersocketID).emit('Ranking-current', index);
      return Promise.all(downloadPromises);
    } else {
      const url_medium = illustration.image_urls.medium;
      const safeTitle = sanitize(`${title}_id:${illustId}`);
      illustration.filename = [`${safeTitle}.jpg`];
      const filePath = path.join(downloadsFolder, `${safeTitle}.jpg`);
      const downloadPromise = downloadImage(url_medium, filePath, Pixiv);
      await fastify.io.to(usersocketID).emit('Ranking-current', index);
      return downloadPromise;
    }
  };
  

  /**
   * Retrieves ranking illustrations and processes them.
   * @param {Object} options - The options for the ranking page.
   * @param {Object} pixiv - The Pixiv API object.
   * @param {Object} Pixiv - The Pixiv class.
   * @param {string} downloadsFolder - The path to the downloads folder.
   * @param {string} usersocketID - The ID of the user's socket.
   * @returns {Array} An array of illustration data.
   */
  const getRakingAndPages = async (options,pixiv,Pixiv,downloadsFolder,usersocketID) => {
    try {
      let listimagefulldata = [];
      const limit = options.tags ? 2 : 1; //Normal =1 loop get images = 30, search by tags=2
      for (let i = 0; i < limit; i++) {
        let {illustrations,nextURL} = await getRankingIllusts(pixiv, options);
        const total = illustrations.length;
        await fastify.io.to(usersocketID).emit('Ranking-total', total);

        // Create an array of promises that process each illustration
        const promises = illustrations.map((illustration, index) => {
          // Pass 'index' as an argument to 'processIllustration'
          return processIllustration(illustration, Pixiv, index,downloadsFolder,usersocketID);
        });
        // Wait for all promises to resolve
        await Promise.all(promises);
        // Add the illustrations to the list
        listimagefulldata.push(...illustrations);
        if (nextURL != null) {
          
          let urlParams = Pixiv.parseQueryString(nextURL);
          options.offset = urlParams["offset"];
        } else {
          options.offset = null;
          break;
        }
      }
      return listimagefulldata;
    } catch (error) {
      console.error(error);
      return null; // or throw error
    }
  };
  fastify.get('/ranking',async(request,reply) =>{
    try {
      

      if (!request.user) {
        // Redirect to login or handle the error since there's no Pixiv setup
        reply.redirect('/login'); // Redirect to the login page or handle the error
        return;
      }

      const { pixiv,options,Pixiv} = request.user;
      let minBookmarkCount = request.query.minBookmarkCount || undefined;
      let tags = (request.query.tags && request.query.tags !== "undefined") ? request.query.tags.split(',') : undefined;
      
      if (minBookmarkCount) {
        options.minBookmarkCount = minBookmarkCount;
        options.tags = tags;
      }
      const downloadsFolder = getDownloadsFolder();
      const mode = request.query.mode;
      options.mode = mode;
      await reply.view('indexRanking.pug',{request});
      const pattern = /mode=([^&]*)/;
        const urlPathfull = request.url;
        const urlPath = urlPathfull.match(pattern);
        let usersocketID;
        fastify.io.once('connection', (socket) => {
          const uuid = uuidv4();
          const sessionId=request.session.get('sessionId');
          const UserRoom = sessionId + '-' + urlPath;
          
          usersocketID = uuid;
          //const usersocketID=usersocketID;
          activeTabs[UserRoom] = usersocketID;
          socket.join(usersocketID);
        });

        await new Promise(resolve => fastify.io.once('connection', resolve));
  
      // Get the user's room ID and socket ID
      const listimagefulldata = await getRakingAndPages(options, pixiv, Pixiv,downloadsFolder,usersocketID);
      console.log("listimagefulldata return:",listimagefulldata);
      let nextUrl = `/ranking/next-page?&mode=${mode}&offset=${options.offset}`;
      if (options.tags || options.minBookmarkCount) {
        nextUrl += `&tags=${options.tags}&minBookmarkCount=${options.minBookmarkCount}`;
      }
      options.offset = undefined;
      options.minBookmarkCount = undefined;
      options.tags = undefined;
      const dataToEmit = {
        files: listimagefulldata,
        downloadsPath: '/static/image/'+ path.basename(downloadsFolder)
      };
      await fastify.io.to(usersocketID).emit('Ranking-nextUrl', nextUrl);
      await fastify.io.to(usersocketID).emit('Ranking-imagefulldata', dataToEmit);
      
      }
      catch (error) {
        console.error('Error:', error);
        reply.status(500).send({ success: false });
      }
  });

  fastify.get('/ranking/next-page', async (request, reply) => {
    try {

      if (!request.user) {
        // Redirect to login or handle the error since there's no Pixiv setup
        fastify.redirect('/login'); // Redirect to the login page or handle the error
        return;
      }     
      
      const {pixiv,options,Pixiv} = request.user;
      let minBookmarkCount = request.query.minBookmarkCount || undefined;
      let tags = (request.query.tags && request.query.tags !== "undefined") ? request.query.tags.split(',') : undefined;
      
      if (minBookmarkCount) {
        options.minBookmarkCount = minBookmarkCount;
        options.tags = tags;
      }
      const downloadsFolder = getDownloadsFolder();
      options.offset = request.query.offset;
      const mode = request.query.mode;
      options.mode = mode;
      await reply.view('indexRanking.pug', {
        request
      });
      // Get the user's room ID and socket ID
      urlPathfull = request.url;
      const pattern =  /mode=([^&]*)/;
      const urlPath = urlPathfull.match(pattern);
      const sessionId = request.session.get('sessionId');
      const UserRoom = sessionId + '-' + urlPath;
      const usersocketID = activeTabs[UserRoom];
      const listimagefulldata = await getRakingAndPages(options, pixiv, Pixiv,downloadsFolder,usersocketID);
      console.log("listimagefulldata return:",listimagefulldata);
      let nextUrl = `/ranking/next-page?&mode=${mode}&offset=${options.offset}`;
      if (options.tags || options.minBookmarkCount) {
        nextUrl += `&tags=${options.tags}&minBookmarkCount=${options.minBookmarkCount}`;
      }
      options.offset = undefined;
      options.minBookmarkCount = undefined;
      options.tags = undefined;
      const dataToEmit = {
        files: listimagefulldata,
        downloadsPath: '/static/image/'+ path.basename(downloadsFolder)
      };
      await fastify.io.to(usersocketID).emit('Ranking-nextUrl', nextUrl);
      await fastify.io.to(usersocketID).emit('Ranking-imagefulldata', dataToEmit);
    } catch (error) {
      console.error('Error getting recommended illusts:', error);
      reply.status(500).send({
        success: false
      });
    }
  });

};
module.exports = RankingPage;