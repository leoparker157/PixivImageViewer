const isAuthenticated = require('../middleware/isAuthenticated'); // Import the middleware
const activeTabs = {};
async function IllustPage(fastify, request) {
  fastify.addHook('preHandler', isAuthenticated)
  const { v4: uuidv4 } = require('uuid');

  const {axios,fs,path,sanitize } = require('../services/initialsetup.js');
  const {getIllustrations} = require('../services/mainFunction.js');
  const checkAndRenamefile= require('../services/otherFunction.js');

  const getDownloadsFolder = () => {
    const folderPath = path.join(__dirname, '..', 'image','Illusts Search');// Modify this folder structure as needed
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
    await fastify.io.to(usersocketID).emit('IllustSearch-current', index); 
    return downloadPromise;
  };

  const getIllustsAndPages = async (options,pixiv,Pixiv,downloadsFolder,usersocketID) => {
    try {
      let listimagefulldata = [];
      const limit = options.tags ? 5 : 1;
      for (let i = 0; i < limit; i++) {
        let {illustrations,nextURL} = await getIllustrations(pixiv, options);
        const total = illustrations.length;
        await fastify.io.to(usersocketID).emit('IllustSearch-total', total);

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
  fastify.get('/illust', async (request, reply) => {
    try {
  
      // Check if the user is logged in
      if (!request.user) {
        // Redirect to login or handle the error since there's no Pixiv setup
        reply.redirect('/login'); // Redirect to the login page or handle the error
        return;
      }
  
      // Check if there's an error in the query
      const error = request.query.error;
      const id = request.query.id;
      let IllustError = false;
      if (error === 'query not found') {
        IllustError = true;
        await reply.view('home.pug', { request, IllustError });
      }
  
      // Get the user's Pixiv information and search query
      const { pixiv, options, Pixiv } = request.user;
      const downloadsFolder = getDownloadsFolder();
      const query = request.query.query;
      options.word = query;
  
      // Get the illustrations from Pixiv
      let { illustrations } = await getIllustrations(pixiv, options);
      //filter
      let minBookmarkCount = request.query.minBookmarkCount || undefined;
      let tags = (request.query.tags && request.query.tags !== "undefined") ? request.query.tags.split(',') : undefined;
      
      if (minBookmarkCount) {
        options.minBookmarkCount = minBookmarkCount;
        options.tags = tags;
      }
      // If there are no illustrations, redirect to the error page
      if (!illustrations || illustrations.length == 0) {
        reply.redirect(`/illust?error=query+not+found`);
        return;
      }
  
      // Render the search results page
      await reply.view('indexSearchIllust.pug', { request });
      const pattern = /query=([^&]*)/;
      const urlPathfull = request.url.replace(/(\s+|%20)+/g, '+'); 
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
      // Wait for a new connection to the socket
      await new Promise(resolve => fastify.io.on('connection', resolve))
  
      // Get the list of illustrations and pages
      const listimagefulldata = await getIllustsAndPages(options, pixiv, Pixiv,downloadsFolder,usersocketID);
      console.log("listimagefulldata return:",listimagefulldata);
      // Get the URL for the next page of search results
      let nextUrl = `/illust/next-page?&query=${query}&offset=${options.offset}`;
      if (options.tags || options.minBookmarkCount) {
        nextUrl += `&tags=${options.tags}&minBookmarkCount=${options.minBookmarkCount}`;
      }
      options.offset = undefined;
      options.minBookmarkCount = undefined;
      options.tags = undefined;
      // Emit the list of illustrations and pages to the socket
      const dataToEmit = {
        files: listimagefulldata,
        downloadsPath: '/static/image/'+path.basename(downloadsFolder),
      };
      await fastify.io.to(usersocketID).emit('IllustSearch-nextUrl', nextUrl);
      await fastify.io.to(usersocketID).emit('IllustSearch-imagefulldata', dataToEmit);
    }
    catch (error) {
      // Handle any errors that occur
      console.error('Error:', error);
      reply.status(500).send({ success: false });
    }
  });



  
  fastify.get('/illust/next-page', async (request, reply) => {
    try {
      if (!request.user) {
        // Redirect to login or handle the error since there's no Pixiv setup
        fastify.redirect('/login'); // Redirect to the login page or handle the error
        return;
      }

      // Get AWS S3 bucket and Pixiv data
      const { pixiv, options, Pixiv } = request.user;
      let minBookmarkCount = request.query.minBookmarkCount || undefined;
      let tags = (request.query.tags && request.query.tags !== "undefined") ? request.query.tags.split(',') : undefined;
      
      if (minBookmarkCount) {
        options.minBookmarkCount = minBookmarkCount;
        options.tags = tags;
      }
      const downloadsFolder = getDownloadsFolder();
      // Set query and offset options
      const query = request.query.query;
      options.offset = request.query.offset;
      options.word = query;

      // Render view
      await reply.view('indexSearchIllust.pug', { request });

      // Get user socket room ID
      const urlPathfull = request.url.replace(/(\s+|%20)+/g, '+');
      const pattern = /query=([^&]*)/;
      const urlPath = urlPathfull.match(pattern);
      const sessionId = request.session.get('sessionId');
      const UserRoom = sessionId + '-' + urlPath;
      const usersocketID = activeTabs[UserRoom];
      // Get list of illustrations and emit data to user socket room
      const listimagefulldata = await getIllustsAndPages(options, pixiv, Pixiv,downloadsFolder,usersocketID);
      console.log("listimagefulldata return:",listimagefulldata);
      let nextUrl = `/illust/next-page?&query=${query}&offset=${options.offset}`;
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
      await fastify.io.to(usersocketID).emit('IllustSearch-nextUrl', nextUrl);
      await fastify.io.to(usersocketID).emit('IllustSearch-imagefulldata', dataToEmit);
    } catch (error) {
      console.error('Error getting recommended illusts:', error);
      reply.status(500).send({ success: false });
    }
  });


};
module.exports = IllustPage;