const isAuthenticated = require('../middleware/isAuthenticated'); // Import the middleware

const activeTabs = {};
async function Userpage(fastify, request) {
    fastify.addHook('preHandler', isAuthenticated)
    const { v4: uuidv4 } = require('uuid');
    const {axios,fs,path,sanitize}=require('../services/initialsetup.js');
    const {getUserIllustrations,getUserDetail} = require('../services/mainFunction.js');
    const checkAndRenamefile= require('../services/otherFunction.js');

    // Check if there is an active socket connection
    /**
     * Returns the path of the downloads folder for user illustrations.
     * If the folder does not exist, it creates it.
     * @returns {string} The path of the downloads folder.
     */
    const getDownloadsFolder = () => {
      const folderPath = path.join(__dirname, '..', 'image','User Illusts');// Modify this folder structure as needed
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
      return folderPath;
    };
  
    /**
     * Downloads an image from a given URL to a specified file path.
     * @param {string} url_medium - The URL of the image to download.
     * @param {string} filePath - The file path to save the downloaded image to.
     * @param {Object} Pixiv - The Pixiv object containing the getAxiosImageStream method.
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
     * @param {Object} Pixiv - The Pixiv object to use for downloading the image.
     * @param {number} index - The index of the current illustration in the array.
     * @param {string} downloadsFolder - The path to the folder where the image will be downloaded.
     * @param {string} usersocketID - The ID of the user's socket connection.
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
      await fastify.io.to(usersocketID).emit('User-current', index); 
      return downloadPromise;
    };
    /**
     * Retrieves user illustrations and pages based on the provided options.
     * @param {Object} options - The options to use for retrieving the illustrations and pages.
     * @param {Object} pixiv - The Pixiv object to use for retrieving the illustrations and pages.
     * @param {Object} Pixiv - The Pixiv class to use for retrieving the illustrations and pages.
     * @param {string} downloadsFolder - The folder to download the illustrations to.
     * @param {string} usersocketID - The ID of the user's socket.
     * @returns {Array} An array of the retrieved illustrations and pages.
     */
    const getUserIllustrationsAndPages = async (options,pixiv,Pixiv,downloadsFolder,usersocketID) => {
      let listimagefulldata = [];
      let numpage = 0;
      const limit = options.tags ? 5 : 1;
      for (let i = 0; i < limit; i++) {
        let { illustrations, nextURL } = await getUserIllustrations(pixiv, options);
        const total = illustrations.length;
        await fastify.io.to(usersocketID).emit('User-total', total);
        
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
    };
    /**
     * Retrieves user details and downloads their avatar image.
     * @param {Object} pixiv - The Pixiv API client.
     * @param {Object} options - The options for the user detail request.
     * @param {Object} Pixiv - The Pixiv class.
     * @param {string} downloadsFolder - The path to the downloads folder.
     * @returns {Object} - The user detail object.
     */
    const getUserDetailPage = async (pixiv, options,Pixiv,downloadsFolder) => {
      try{
        let userDetail  = await getUserDetail(pixiv, options);
      let username= userDetail.user.account;
      let userid = userDetail.user.id;
      const safeTitle = sanitize(`${username}_id:${userid}`);
      userDetail.user.avatar = `${safeTitle}.jpg`;
      const filePath = path.join(downloadsFolder, `${safeTitle}.jpg`);
      let useravatar= userDetail.user.profile_image_urls.medium;
      checkAndRenamefile(fs, path, filePath, downloadsFolder, userDetail.user);
      await downloadImage(useravatar, filePath,Pixiv);
      return userDetail;
    } catch (error) {
      console.error(error);
      return null; // or throw error
      }
    }  
    fastify.get('/user',async(request,reply) =>{
      try {
        const error = request.query.error;
         const id = request.query.id;
         let userIdError = false;
         if (error === 'User ID not found') {
          userIdError = true;
         }
        if (!request.user) {
            // Redirect to login or handle the error since there's no Pixiv setup
            reply.redirect('/login'); // Redirect to the login page or handle the error
            return;
          }
        await reply.view('indexUser.pug', {request,userIdError});
        }
        catch (error) {
          console.error('Error:', error);
          reply.status(500).send({ success: false });
        }
    });
    fastify.get('/user/:id', async (request, reply) => {
      try {
        if (!request.user) {
            // Redirect to login or handle the error since there's no Pixiv setup
            reply.redirect('/login'); // Redirect to the login page or handle the error
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
        options.offset = undefined;
        const userId = request.params.id;
        options.userId = userId;
        const UserDetail= await getUserDetailPage(pixiv,options,Pixiv,downloadsFolder);
        if (!UserDetail) {
          reply.redirect(`/user?error=User+ID+not+found&id=${userId}`);
          
          return;
        }
        await reply.view('indexUser.pug', {request});
        const pattern = /\/user\/\d+/;
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

        const listimagefulldata = await getUserIllustrationsAndPages(options,pixiv,Pixiv,downloadsFolder,usersocketID);
        console.log("listimagefulldata return:",listimagefulldata);
        let nextUrl = `/user/${options.userId}/next-page-url?offset=${options.offset}`;
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
        const UserDetailAndAvatar = {
          UserDetail: UserDetail,
          downloadsPath: '/static/image/'+ path.basename(downloadsFolder),
        };
         await fastify.io.to(usersocketID).emit('UserDetailAndAvatar', UserDetailAndAvatar);
         await fastify.io.to(usersocketID).emit('User-nextUrl', nextUrl);
         await fastify.io.to(usersocketID).emit('User-imagefulldata', dataToEmit);
      } catch (error) {
        console.error('Error getting user illusts:', error);
        reply.status(500).send({ success: false });
      }
    });
    
    fastify.get('/user/:id/next-page-url', async (request, reply) => {
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
        options.userId = request.params.id;
        options.offset = request.query.offset;
        const userId = request.params.id;
        await reply.view('indexUser.pug', {request});
        // Get the user's room ID and socket ID
        urlPathfull = request.url;
        const pattern = /\/user\/\d+/;
        const urlPath = urlPathfull.match(pattern);
        const sessionId = request.session.get('sessionId');
      const UserRoom = sessionId + '-' + urlPath;
        const usersocketID = activeTabs[UserRoom];
        const listimagefulldata = await getUserIllustrationsAndPages(options,pixiv,Pixiv,downloadsFolder,usersocketID);
        console.log("listimagefulldata return:",listimagefulldata);
        let nextUrl = `/user/${options.userId}/next-page-url?offset=${options.offset}`;
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
         await fastify.io.to(usersocketID).emit('User-nextUrl', nextUrl);
         await fastify.io.to(usersocketID).emit('User-imagefulldata', dataToEmit);
      } catch (error) {
        console.error('Error getting user illusts:', error);
        reply.status(500).send({ success: false });
      }
    });
     
  };
  module.exports = Userpage;