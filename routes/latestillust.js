const isAuthenticated = require('../middleware/isAuthenticated'); // Import the middleware
const activeTabs = {};
async function latestIllusts(fastify, request) {
  fastify.addHook('preHandler', isAuthenticated)
  const { v4: uuidv4 } = require('uuid');

  const {axios,fs,path,sanitize}=require('../services/initialsetup.js');
  const {getLatestIllustrations} = require('../services/mainFunction.js');
  const checkAndRenamefile= require('../services/otherFunction.js');

  // Check if there is an active socket connection

  const getDownloadsFolder = () => {
    const folderPath = path.join(__dirname, '..', 'image','Latest Illusts');// Modify this folder structure as needed
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    return folderPath;
  };

  const downloadImage = async (url_medium, filePath,Pixiv) => {
    if (!fs.existsSync(filePath)) {
      const imageStreamResponse = await Pixiv.getAxiosImageStream(url_medium);
      const waitingdone = imageStreamResponse.data.pipe(fs.createWriteStream(filePath));
      await new Promise((resolve) => waitingdone.on('finish', resolve));
    }
  };

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
    await fastify.io.to(usersocketID).emit('LatestIllust-current', index); 
    return downloadPromise;
  };
  const getLatestIllustrationsAndPages = async (options,pixiv,Pixiv,downloadsFolder,usersocketID) => {
    let listimagefulldata = [];
    const limit = options.tags ? 3 : 1;
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