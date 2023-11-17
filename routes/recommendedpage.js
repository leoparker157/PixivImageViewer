const isAuthenticated = require('../middleware/isAuthenticated'); // Import the middleware
const activeTabs = {};
async function recommendedpage(fastify, request) {
  
  fastify.addHook('preHandler', isAuthenticated)
  const { v4: uuidv4 } = require('uuid');

  const {axios,fs,path,sanitize}=require('../services/initialsetup.js');
  const {getRecommendedIllustrations} = require('../services/mainFunction.js');
  const checkAndRenamefile= require('../services/otherFunction.js');

  // Check if there is an active socket connection

  /**
   * Returns the path to the folder where recommended illusts will be saved.
   * If the folder doesn't exist, it will be created.
   * @returns {string} The path to the recommended illusts folder.
   */
  const getDownloadsFolder = () => {
    const folderPath = path.join(__dirname, '..', 'image','Recommended Illusts');// Modify this folder structure as needed
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    return folderPath;
  };

  /**
   * Downloads an image from a given URL to a specified file path using the provided Pixiv object.
   * @param {string} url_medium - The URL of the image to download.
   * @param {string} filePath - The file path to save the downloaded image to.
   * @param {object} Pixiv - The Pixiv object used to make the image stream request.
   * @returns {Promise<void>} - A Promise that resolves when the image has been downloaded and saved to the specified file path.
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
   * @param {string} usersocketID - The ID of the user's socket.
   * @returns {Promise} A promise that resolves when the image has been downloaded.
   */
  const processIllustration = async (illustration, Pixiv, index,downloadsFolder,usersocketID) => {
    const illustId = illustration.id;
    const url_medium = illustration.image_urls.medium;
    const title = illustration.title;
    const total_bookmarks = illustration.total_bookmarks;
    const safeTitle = sanitize(`${title}_id:${illustId}`);
    illustration.filename = `${safeTitle}.jpg`;
    const filePath = path.join(downloadsFolder, `${safeTitle}.jpg`);
    checkAndRenamefile(fs, path, filePath, downloadsFolder, illustration);
    const downloadPromise = downloadImage(url_medium, filePath,Pixiv);
    await fastify.io.to(usersocketID).emit('Recommended-current', index); 
    return downloadPromise;
  };

  /**
   * Retrieves recommended illustrations and pages based on the provided options.
   * @async
   * @function getRecommendedIllustrationsAndPages
   * @param {Object} options - The options to use for retrieving the recommended illustrations and pages.
   * @param {Object} pixiv - The Pixiv object to use for retrieving the illustrations.
   * @param {Object} Pixiv - The Pixiv class to use for retrieving the illustrations.
   * @param {string} downloadsFolder - The path to the downloads folder.
   * @param {string} usersocketID - The ID of the user's socket.
   * @returns {Promise<Array>} - A promise that resolves with an array of recommended illustrations and pages.
   */
  const getRecommendedIllustrationsAndPages = async (options,pixiv,Pixiv,downloadsFolder,usersocketID)=> {
    let listimagefulldata = [];
    const limit = options.tags ? 5 : 1;
    for (let i = 0; i < limit; i++) {
      let { illustrations, nextURL } = await getRecommendedIllustrations(pixiv, options);
      const total = illustrations.length;
      await fastify.io.to(usersocketID).emit('Recommended-total', total);
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
          options.maxBookmarkIdForRecommend = urlParams["max_bookmark_id_for_recommend"];
        } else {
        }
    }
    return listimagefulldata;
  };

  fastify.get('/recommendedpage', async (request, reply) => {
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
      await reply.view('indexRecommended.pug', {request});
      // Wait for a new connection to the socket
      const pattern = /\/recommendedpage/;
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
      const listimagefulldata = await getRecommendedIllustrationsAndPages(options,pixiv,Pixiv,downloadsFolder,usersocketID);
      console.log("listimagefulldata return:",listimagefulldata);
      let nextUrl = `/recommendedpage/next-page-url?max_bookmark_id_for_recommend=${options.maxBookmarkIdForRecommend}`;
      if (options.tags || options.minBookmarkCount) {
        nextUrl += `&tags=${options.tags}&minBookmarkCount=${options.minBookmarkCount}`;
      }
      options.maxBookmarkIdForRecommend  = undefined;
      options.minBookmarkCount = undefined;
      options.tags = undefined;
      const dataToEmit = {
        files: listimagefulldata,
        downloadsPath: '/static/image/'+ path.basename(downloadsFolder),
      };
      await fastify.io.to(usersocketID).emit('Recommended-nextUrl', nextUrl);
      await fastify.io.to(usersocketID).emit('Recommended-imagefulldata', dataToEmit);
    } catch (error) {
      console.error('Error getting recommended illusts:', error);
      reply.status(500).send({
        success: false
      });
    }
  });

  fastify.get('/recommendedpage/next-page-url', async (request, reply) => {
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
      await reply.view('indexRecommended.pug', {request});
      // Get the user's room ID and socket ID
      urlPathfull = request.url;
      const pattern = /\/recommendedpage/;
      const urlPath = urlPathfull.match(pattern);
      const sessionId = request.session.get('sessionId');
      const UserRoom = sessionId + '-' + urlPath;
      const usersocketID = activeTabs[UserRoom];
      options.maxBookmarkIdForRecommend  = request.query.max_bookmark_id_for_recommend;
      const listimagefulldata = await getRecommendedIllustrationsAndPages(options,pixiv,Pixiv,downloadsFolder,usersocketID);
      console.log("listimagefulldata return:",listimagefulldata);
      let nextUrl = `/recommendedpage/next-page-url?max_bookmark_id_for_recommend=${options.maxBookmarkIdForRecommend}`;
      if (options.tags || options.minBookmarkCount) {
        nextUrl += `&tags=${options.tags}&minBookmarkCount=${options.minBookmarkCount}`;
      }
      options.maxBookmarkIdForRecommend  = undefined;
      options.minBookmarkCount = undefined;
      options.tags = undefined;
      const dataToEmit = {
        files: listimagefulldata,
        downloadsPath: '/static/image/'+ path.basename(downloadsFolder),
      };
      await fastify.io.to(usersocketID).emit('Recommended-nextUrl', nextUrl);
      await fastify.io.to(usersocketID).emit('Recommended-imagefulldata', dataToEmit);
    } catch (error) {
      console.error('Error getting recommended illusts:', error);
      reply.status(500).send({
        success: false
      });
    }
  });

};
module.exports = recommendedpage;