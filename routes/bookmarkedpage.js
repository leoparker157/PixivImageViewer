const isAuthenticated = require('../middleware/isAuthenticated'); // Import the middleware
const activeTabs = {};
/**
 * Retrieves and processes bookmarked illustrations from Pixiv and downloads them to a specified folder.
 * @param {Object} fastify - Fastify instance.
 * @param {Object} request - HTTP request object.
 * @returns {Promise} - Promise that resolves when all bookmarked illustrations have been processed and downloaded.
 */
async function bookmarkedpage(fastify, request) {
  // Add hook to check if user is authenticated before proceeding
  fastify.addHook('preHandler', isAuthenticated);

  // Import required modules
  const { v4: uuidv4 } = require('uuid');
  const { axios, fs, path, sanitize } = require('../services/initialsetup.js');
  const { getBookmarkedIllustrations } = require('../services/mainFunction.js');
  const checkAndRenamefile = require('../services/otherFunction.js');

  /**
   * Retrieves the path to the folder where downloaded illustrations will be saved.
   * If the folder does not exist, it is created.
   * @returns {string} - Path to the downloads folder.
   */
  const getDownloadsFolder = () => {
    const folderPath = path.join(__dirname, '..', 'image', 'Bookmarked Illusts'); // Modify this folder structure as needed
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    return folderPath;
  };

  /**
   * Downloads an illustration from a specified URL and saves it to a specified file path.
   * If the file already exists, it is not downloaded again.
   * @param {string} url_medium - URL of the medium-sized image to download.
   * @param {string} filePath - Path to the file where the image will be saved.
   * @param {Object} Pixiv - Pixiv instance.
   * @returns {Promise} - Promise that resolves when the image has been downloaded and saved.
   */
  const downloadImage = async (url_medium, filePath, Pixiv) => {
    if (!fs.existsSync(filePath)) {
      const imageStreamResponse = await Pixiv.getAxiosImageStream(url_medium);
      const waitingdone = imageStreamResponse.data.pipe(fs.createWriteStream(filePath));
      await new Promise((resolve) => waitingdone.on('finish', resolve));
    }
  };

  /**
   * Processes a single bookmarked illustration by downloading it and emitting a progress update to the user's socket.
   * @param {Object} illustration - Object representing the bookmarked illustration to process.
   * @param {Object} Pixiv - Pixiv instance.
   * @param {number} index - Index of the illustration in the list of bookmarked illustrations.
   * @param {string} downloadsFolder - Path to the folder where downloaded illustrations will be saved.
   * @param {string} usersocketID - ID of the user's socket.
   * @returns {Promise} - Promise that resolves when the illustration has been downloaded and saved.
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
      await fastify.io.to(usersocketID).emit('Bookmarked-current', index);
      return Promise.all(downloadPromises);
    } else {
      const url_medium = illustration.image_urls.medium;
      const safeTitle = sanitize(`${title}_id:${illustId}`);
      illustration.filename = [`${safeTitle}.jpg`];
      const filePath = path.join(downloadsFolder, `${safeTitle}.jpg`);
      const downloadPromise = downloadImage(url_medium, filePath, Pixiv);
      await fastify.io.to(usersocketID).emit('Bookmarked-current', index);
      return downloadPromise;
    }
  };
  

  /**
   * Retrieves all bookmarked illustrations from Pixiv and processes them by downloading and saving them to a specified folder.
   * @param {Object} options - Object containing options for retrieving bookmarked illustrations from Pixiv.
   * @param {Object} pixiv - Pixiv instance.
   * @param {Object} Pixiv - Pixiv instance.
   * @param {string} downloadsFolder - Path to the folder where downloaded illustrations will be saved.
   * @param {string} usersocketID - ID of the user's socket.
   * @returns {Promise} - Promise that resolves with an array of objects representing the downloaded illustrations.
   */
  const getBookmarkedIllustrationsAndPages = async (options, pixiv, Pixiv, downloadsFolder, usersocketID) => {
    let listimagefulldata = [];
    const limit = options.tags ? 7 : 1; //Normal =1 loop get images = 30, search by tags=7
    for (let i = 0; i < limit; i++) {
      let { illustrations, nextURL } = await getBookmarkedIllustrations(pixiv, options);
      const total = illustrations.length;
      await fastify.io.to(usersocketID).emit('Bookmarked-total', total);

      // Create an array of promises that process each illustration
      const promises = illustrations.map((illustration, index) => {
        // Pass 'index' as an argument to 'processIllustration'
        return processIllustration(illustration, Pixiv, index, downloadsFolder, usersocketID);
      });
      // Wait for all promises to resolve
      await Promise.all(promises);
      // Add the illustrations to the list
      listimagefulldata.push(...illustrations);
      if (nextURL != null) {
        let urlParams = Pixiv.parseQueryString(nextURL);
        options.maxBookmarkId = urlParams["max_bookmark_id"];
      } else {
      }
    }
    return listimagefulldata;
  };

  // Handle GET request to '/bookmarkedpage'
  fastify.get('/bookmarkedpage', async (request, reply) => {
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
      await reply.view('indexBookmarked.pug', { request });
      const pattern = /\/bookmarkedpage/;
      const urlPathfull = request.url;
      const urlPath = urlPathfull.match(pattern);
      let usersocketID;
      fastify.io.once('connection', (socket) => {
        const uuid = uuidv4();
        const sessionId = request.session.get('sessionId');
        const UserRoom = sessionId + '-' + urlPath;
        usersocketID = uuid;
        activeTabs[UserRoom] = usersocketID;
        socket.join(usersocketID);
      });

      // Wait for a new connection to the socket
      await new Promise(resolve => fastify.io.on('connection', resolve))
      // Get the user's room ID and socket ID

      const listimagefulldata = await getBookmarkedIllustrationsAndPages(options, pixiv, Pixiv, downloadsFolder, usersocketID);
      console.log("listimagefulldata return:",listimagefulldata);
      let nextUrl = `/bookmarkedpage/next-page-url?max_bookmark_id=${options.maxBookmarkId}`;
      if (options.tags || options.minBookmarkCount) {
        nextUrl += `&tags=${options.tags}&minBookmarkCount=${options.minBookmarkCount}`;
      }
      options.maxBookmarkId = undefined;
      options.minBookmarkCount = undefined;
      options.tags = undefined;
      const dataToEmit = {
        files: listimagefulldata,
        downloadsPath: "/static/image/" + path.basename(downloadsFolder),
      };
      await fastify.io.to(usersocketID).emit('Bookmarked-nextUrl', nextUrl);
      await fastify.io.to(usersocketID).emit('Bookmarked-imagefulldata', dataToEmit);
    } catch (error) {
      console.error('Error getting recommended illusts:', error);
      reply.status(500).send({
        success: false
      });
    }
  });

  // Handle GET request to '/bookmarkedpage/next-page-url'
  fastify.get('/bookmarkedpage/next-page-url', async (request, reply) => {
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
      await reply.view('indexBookmarked.pug', {request});
      // Get user socket room ID
      const urlPathfull = request.url;
      const pattern = /\/bookmarkedpage/;
      const urlPath = urlPathfull.match(pattern);
      const sessionId = request.session.get('sessionId');
      const UserRoom = sessionId + '-' + urlPath;
      const usersocketID = activeTabs[UserRoom];
      
      options.maxBookmarkId = request.query.max_bookmark_id;
      const listimagefulldata = await getBookmarkedIllustrationsAndPages(options, pixiv, Pixiv,downloadsFolder,usersocketID);
      console.log("listimagefulldata return:",listimagefulldata);
      let nextUrl = `/bookmarkedpage/next-page-url?max_bookmark_id=${options.maxBookmarkId}`;
      if (options.tags || options.minBookmarkCount) {
        nextUrl += `&tags=${options.tags}&minBookmarkCount=${options.minBookmarkCount}`;
      }
      options.maxBookmarkId = undefined;
      options.minBookmarkCount = undefined;
      options.tags = undefined;
      const dataToEmit = {
        files: listimagefulldata,
        downloadsPath: '/static/image/'+ path.basename(downloadsFolder),
      };
      await fastify.io.to(usersocketID).emit('Bookmarked-nextUrl', nextUrl);
      await fastify.io.to(usersocketID).emit('Bookmarked-imagefulldata', dataToEmit);
    } catch (error) {
      console.error('Error getting recommended illusts:', error);
      reply.status(500).send({
        success: false
      });
    }
  });

};
module.exports = bookmarkedpage;