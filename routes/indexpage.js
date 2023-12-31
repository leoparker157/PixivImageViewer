//indexpage.js
const { encrypt, decrypt } = require('../services/EncryptAndDecrypt');

// Create a Map to keep track of unique visitors
const visitors = new Map();

async function indexPage(fastify, opts) {
  fastify.get('/', async (request, reply) => {
    try {
      const error = request.query.error;
      const id = request.query.id;
      let userIdError = false;
      if (error === 'User ID not found') {
        userIdError = true;
      }
      const secretKey = 'pixivimageviewer';
      const encryptedToken = request.session.get('refreshToken') || request.headers['x-refresh-token'];
      let refreshToken;
      try {
        refreshToken = encryptedToken ? decrypt(encryptedToken, secretKey) : null;
      } catch (error) {
        request.session.refreshToken = undefined;
        console.log("error: refreshToken not found")
      }

      // Get the sessionId from the cookies
      const sessionId = request.cookies.sessionId;

      // Check if the visitor has been counted before
      if (!visitors.has(sessionId)) {
        // If not, add them to the Map and increment the count
        visitors.set(sessionId, true);
        // Get the total number of unique visitors
        const uniqueVisitors = visitors.size;
        console.log("visitor: ", uniqueVisitors);
      }

      await reply.view('home.pug', {
        request,
        userIdError,
        //downloadsPath: '/static/image/' + path.basename(downloadsFolder),
      });
    } catch (error) {
      console.error('Error getting recommended illusts:', error);
      reply.status(500).send({
        success: false
      });
    }
  });
};

module.exports = indexPage;