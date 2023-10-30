const isAuthenticated = require('../middleware/isAuthenticated'); // Import the middleware
const activeTabs = {};
async function relatedIllusts(fastify, request) {
  fastify.addHook('preHandler', isAuthenticated)
  const { v4: uuidv4 } = require('uuid');


  const {axios,fs,path,sanitize}=require('../services/initialsetup.js');
  const {getRelatedIllustrations} = require('../services/mainFunction.js');  
  const checkAndRenamefile= require('../services/otherFunction.js');

// Check if there is an active socket connection

const getDownloadsFolder = () => {
  const folderPath = path.join(__dirname, '..', 'image','related Illusts');// Modify this folder structure as needed
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
  await fastify.io.to(usersocketID).emit('RelatedIllust-current', index); 
  return downloadPromise;
};


  const getRelatedIllustrationsAndPages = async (options,pixiv,Pixiv,downloadsFolder,usersocketID) => {
    try {
        let listimagefulldata = [];
        let numpage = 0;
        const limit = options.tags ? 5 : 1;
        for (let i = 0; i < limit; i++) {
        let { illustrations, nextURL } = await getRelatedIllustrations(pixiv, options);
        const total = illustrations.length;
        await fastify.io.to(usersocketID).emit('RelatedIllust-total', total);
        
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
            options.seed_illust_ids=urlParams['seed_illust_ids'];
            options.next_seed=urlParams.viewed['0'];
            } else {
            }
        }
        return listimagefulldata;
    }catch (error) {
        console.error(error);
        return null; // or throw error
      }
  };

  fastify.get('/related', async (request, reply) => {
    try {
      if (!request.user) {
        // Redirect to login or handle the error since there's no Pixiv setup
        fastify.redirect('/login'); // Redirect to the login page or handle the error
        return;
      }
      const error = request.query.error;
      let IllustRelatedError = false;
       if (error === 'illustID not found') {
        IllustRelatedError = true;
        await reply.view('indexRelatedIllust.pug', {request,IllustRelatedError});
       }
       
      const { pixiv, options, Pixiv } = request.user;
      let minBookmarkCount = request.query.minBookmarkCount || undefined;
      let tags = (request.query.tags && request.query.tags !== "undefined") ? request.query.tags.split(',') : undefined;
      
      if (minBookmarkCount) {
        options.minBookmarkCount = minBookmarkCount;
        options.tags = tags;
      }
      const downloadsFolder = getDownloadsFolder();
      const query = request.query.illustId;
      options.illustId = query;
      let {illustrations} =await getRelatedIllustrations(pixiv, options);
      if (!illustrations || illustrations.length==0 ) {
        reply.redirect(`/related?error=illustID+not+found`);
        return;
      }
      await reply.view('indexRelatedIllust.pug', {request});
      // Wait for a new connection to the socket
      const pattern = /\/related\?illustId=\d+/;
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
      const listimagefulldata = await getRelatedIllustrationsAndPages(options,pixiv,Pixiv,downloadsFolder,usersocketID);
      console.log("listimagefulldata return:",listimagefulldata);
      let nextUrl;
      //let nextUrl = `/related/next-page-url?illustId=${options.next_seed}&seed_illust_ids[0]=${options.next_seed}&offset=${options.offset}`;
      // if (options.tags || options.minBookmarkCount) {
      //   nextUrl += `&tags=${options.tags}&minBookmarkCount=${options.minBookmarkCount}`;
      // }
      options.offset = undefined;
      options.minBookmarkCount = undefined;
      options.tags = undefined;
      const dataToEmit = {
        files: listimagefulldata,
        downloadsPath: '/static/image/'+ path.basename(downloadsFolder),
      };
        if (nextUrl) {
          await fastify.io.to(usersocketID).emit('RelatedIllust-nextUrl', nextUrl);
        } else {
          await fastify.io.to(usersocketID).emit('RelatedIllust-nextUrl', false);
        }
        await fastify.io.to(usersocketID).emit('RelatedIllust-imagefulldata', dataToEmit);
      } catch (error) {
      console.error('Error getting recommended illusts:', error);
      reply.status(500).send({
        success: false
      });
    }
  });

  fastify.get('/related/next-page-url', async (request, reply) => {
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
      const query = request.query.illustId;
      options.illustId = query;
      let seedIllustIds = request.query['seed_illust_ids[0]'];
    //   options.seed_illust_ids=seedIllustIds;
      options.seed_illust_ids=seedIllustIds;
      await reply.view('indexRelatedIllust.pug', {request});
      // Get the user's room ID and socket ID
      urlPathfull = request.url;
      const pattern = /\/related\?illustId=\d+/;
      const urlPath = urlPathfull.match(pattern);
      const sessionId = request.session.get('sessionId');
      const UserRoom = sessionId + '-' + urlPath;
      const usersocketID = activeTabs[UserRoom];


      options.offset = request.query.offset;
      options.offset = Number(options.offset) + 30;

      const listimagefulldata = await getRelatedIllustrationsAndPages(options,pixiv,Pixiv,s3, bucketNam,usersocketID);
      console.log("listimagefulldata return:",listimagefulldata);
      let nextUrl = `/related/next-page-url?illustId=${options.next_seed}&seed_illust_ids[0]=${options.next_seed}&offset=${options.offset}`;
      //let nextUrl = `/related/next-page-url?illustId=${options.next_seed}&offset=${options.offset}`;
      options.offset  = undefined;
      options.minBookmarkCount = undefined;
      options.tags = undefined;
      const dataToEmit = {
        files: listimagefulldata,
        downloadsPath: '/static/image/'+ path.basename(downloadsFolder),
      };
      await fastify.io.to(usersocketID).emit('RelatedIllust-imagefulldata', dataToEmit);
      //console.log("options.maxBookmarkId la" + nextUrl);
      await fastify.io.to(usersocketID).emit('RelatedIllust-nextUrl', nextUrl);
    } catch (error) {
      console.error('Error getting recommended illusts:', error);
      reply.status(500).send({
        success: false
      });
    }
  });

};
module.exports = relatedIllusts;