const isAuthenticated = require('../middleware/isAuthenticated'); // Import the middleware
const activeTabs = {};
async function latestIllusts(fastify, request) {
  fastify.addHook('preHandler', isAuthenticated)
  const { v4: uuidv4 } = require('uuid');
  const {axios,fs,path,sanitize}=require('../services/initialsetup.js');
  const {getLatestIllustrations} = require('../services/mainFunction.js');
  const checkAndRenamefile= require('../services/otherFunction.js');

  // Check if there is an active socket connection
  /**
   * Returns the path of the folder where the latest illusts will be saved.
   * If the folder does not exist, it will be created.
   * @returns {string} The path of the folder where the latest illusts will be saved.
   */
  const getDownloadsFolder = () => {
    const folderPath = path.join(__dirname, '..', 'image','Latest Illusts');// Modify this folder structure as needed
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    return folderPath;
  };

  /**
   * Downloads an image from a given URL and saves it to a specified file path.
   * @param {string} url_medium - The URL of the image to download.
   * @param {string} filePath - The file path to save the downloaded image to.
   * @param {Object} Pixiv - The Pixiv object containing the getAxiosImageStream method.
   * @returns {Promise<void>} - A Promise that resolves when the image has been downloaded and saved.
   */
  const downloadImage = async (url_medium, filePath,Pixiv) => {
    if (!fs.existsSync(filePath)) {
      const imageStreamResponse = await Pixiv.getAxiosImageStream(url_medium);
      const waitingdone = imageStreamResponse.data.pipe(fs.createWriteStream(filePath));
      await new Promise((resolve) => waitingdone.on('finish', resolve));
    }
  };

  /**
   * Processes an illustration object and downloads the image to the specified folder.
   * @param {Object} illustration - The illustration object to process.
   * @param {Object} Pixiv - The Pixiv object used for downloading the image.
   * @param {number} index - The index of the current illustration in the list.
   * @param {string} downloadsFolder - The path to the folder where the image will be downloaded.
   * @param {string} usersocketID - The ID of the user's socket connection.
   * @returns {Promise} A promise that resolves when the image has finished downloading.
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
      await fastify.io.to(usersocketID).emit('LatestIllust-current', index);
      return Promise.all(downloadPromises);
    } else {
      const url_medium = illustration.image_urls.medium;
      const safeTitle = sanitize(`${title}_id:${illustId}`);
      illustration.filename = [`${safeTitle}.jpg`];
      const filePath = path.join(downloadsFolder, `${safeTitle}.jpg`);
      const downloadPromise = downloadImage(url_medium, filePath, Pixiv);
      await fastify.io.to(usersocketID).emit('LatestIllust-current', index);
      return downloadPromise;
    }
  };
  /**
   * Retrieves the latest illustrations and their pages from Pixiv based on the given options.
   * @async
   * @function getLatestIllustrationsAndPages
   * @param {Object} options - The options to use for the Pixiv API request.
   * @param {Object} pixiv - The Pixiv API client.
   * @param {Object} Pixiv - The Pixiv API class.
   * @param {string} downloadsFolder - The path to the downloads folder.
   * @param {string} usersocketID - The ID of the user's socket.
   * @returns {Promise<Array>} - An array of the latest illustrations and their pages.
   */
  const getLatestIllustrationsAndPages = async (options,pixiv,Pixiv,downloadsFolder,usersocketID) => {
    let listimagefulldata = [];
    const limit = options.tags ? 7 : 1; //Normal =1 loop get images = 30, search by tags=7
    for (let i = 0; i < limit; i++) {
      let { illustrations, nextURL } = await getLatestIllustrations(pixiv, options);
      const total = illustrations.length;
      await fastify.io.to(usersocketID).emit('LatestIllust-total', total);
      
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
        }
    }
    return listimagefulldata;
  };

  fastify.get('/latest', async (request, reply) => {
    try {
      if (!request.user) {
        // Redirect to login or handle the error since there's no Pixiv setup
        fastify.redirect('/login'); // Redirect to the login page or handle the error
        return;
      }

      const { pixiv, options, Pixiv } = request.user;
      let minBookmarkCount = request.query.minBookmarkCount || undefined;
      let tags = (request.query.tags && request.query.tags !== "undefined") ? request.query.tags.split(',') : undefined;
      
      if (minBookmarkCount) {
        options.minBookmarkCount = minBookmarkCount;
        options.tags = tags;
      }
      const downloadsFolder = getDownloadsFolder();
      await reply.view('indexLatestIllust.pug', {request});
            // Wait for a new connection to the socket
        const pattern = /\/latest/;
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
      // Get the user's room ID and socket ID
      await new Promise(resolve => fastify.io.on('connection', resolve))
      const listimagefulldata = await getLatestIllustrationsAndPages(options, pixiv, Pixiv,downloadsFolder,usersocketID);
      console.log("listimagefulldata return:",listimagefulldata);
      let nextUrl = `/latest/next-page-url?offset=${options.offset}`;
      if (options.tags || options.minBookmarkCount) {
        nextUrl += `&tags=${options.tags}&minBookmarkCount=${options.minBookmarkCount}`;
      }
      options.offset = undefined;
      options.minBookmarkCount = undefined;
      options.tags = undefined;
      const dataToEmit = {
        files: listimagefulldata,
        downloadsPath: '/static/image/'+ path.basename(downloadsFolder),
      };
      await fastify.io.to(usersocketID).emit('LatestIllust-nextUrl', nextUrl);
      await fastify.io.to(usersocketID).emit('LatestIllust-imagefulldata', dataToEmit);
    } catch (error) {
      console.error('Error getting recommended illusts:', error);
      reply.status(500).send({
        success: false
      });
    }
  });

  fastify.get('/latest/next-page-url', async (request, reply) => {
    try {
      if (!request.user) {
        // Redirect to login or handle the error since there's no Pixiv setup
        fastify.redirect('/login'); // Redirect to the login page or handle the error
        return;
      }
      const { pixiv, options, Pixiv } = request.user;
      let minBookmarkCount = request.query.minBookmarkCount || undefined;
      let tags = (request.query.tags && request.query.tags !== "undefined") ? request.query.tags.split(',') : undefined;
      
      if (minBookmarkCount) {
        options.minBookmarkCount = minBookmarkCount;
        options.tags = tags;
      }
      const downloadsFolder = getDownloadsFolder();
      await reply.view('indexLatestIllust.pug', {request});
      // Get user socket room ID
      const urlPathfull = request.url;
      const pattern = /\/latest/;
      const urlPath = urlPathfull.match(pattern);
      const sessionId = request.session.get('sessionId');
      const UserRoom = sessionId + '-' + urlPath;
      const usersocketID = activeTabs[UserRoom];
      

      options.offset = request.query.offset;
      const listimagefulldata = await getLatestIllustrationsAndPages(options, pixiv, Pixiv,downloadsFolder,usersocketID);
      console.log("listimagefulldata return:",listimagefulldata);
      let nextUrl = `/latest/next-page-url?offset=${options.offset}`;
      if (options.tags || options.minBookmarkCount) {
        nextUrl += `&tags=${options.tags}&minBookmarkCount=${options.minBookmarkCount}`;
      }
      options.offset  = undefined;
      options.minBookmarkCount = undefined;
      options.tags = undefined;
      const dataToEmit = {
        files: listimagefulldata,
        downloadsPath: '/static/image/'+ path.basename(downloadsFolder),
      };
      await fastify.io.to(usersocketID).emit('LatestIllust-nextUrl', nextUrl);
      await fastify.io.to(usersocketID).emit('LatestIllust-imagefulldata', dataToEmit);
    } catch (error) {
      console.error('Error getting latest illusts:', error);
      reply.status(500).send({
        success: false
      });
    }
  });

};
module.exports = latestIllusts;