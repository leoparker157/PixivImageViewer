// Import necessary modules
const { setupPixiv } = require('../services/initialsetup');
const { encrypt, decrypt } = require('../services/EncryptAndDecrypt');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

// Define the LoginByRefreshToken function
async function LoginByRefreshToken(fastify, opts) {
  // Handle GET request to /login
  fastify.get('/login', async (request, reply) => {
    try {
      // Render the login page
      await reply.view('loginpage.pug', { request });
    } catch (error) {
      // Handle errors while rendering the login page
      console.error('Error rendering login page:', error);
      reply.view('error.pug', { error: 'Error rendering login page' });
    }
  });

  // Handle POST request to /login
  fastify.post('/login', async (request, reply) => {
    let refreshToken = null;
    try {
      const stdout = await new Promise((resolve, reject) => {
        exec('node services/pixiv_token.js login', (error, stdout) => {
        resolve(stdout);
        });
      });
  
      if (stdout.includes('refresh_token')) {
        const match = stdout.match(/refresh_token: ([\w-]+)/);
        refreshToken = match ? match[1] : null;
      } else {
        reply.view('error.pug', { error: 'refresh_token not found' });
      }
    } catch (error) {
      reply.view('loginpage.pug', { request, error: 'Error during Pixiv setup' });
    }

    const secretKey = 'pixivimageviewer';
    try {
      // Setup the Pixiv object using the provided refresh token
      const result = await setupPixiv(refreshToken);
      const encryptedToken = encrypt(refreshToken, secretKey);
      if (!result) {
        // Handle errors when the refresh token is invalid or expired
        return reply.view('loginpage.pug', {
          request,
          error: 'Wrong refresh token or refresh token expired',
        });
      }
  
      // Do whatever you need with the pixiv object and options here
      // For example, you can store them in a session or perform other actions
      request.session.set('LoginStatus', true);
      request.session.set('refreshToken', encryptedToken);
      const sessionId = uuidv4();
      request.session.set('sessionId', sessionId);
      console.log('Login success');
      reply.redirect('/');
    } catch (error) {
      // Handle errors during Pixiv setup
      console.error('Error during Pixiv setup:', error);
      reply.view('loginpage.pug', {
        request,
        error: 'Error during Pixiv setup',
      });
    }
  });
}

// Export the LoginByRefreshToken function
module.exports = LoginByRefreshToken;
