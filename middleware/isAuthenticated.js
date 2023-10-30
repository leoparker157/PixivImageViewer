const { setupPixiv } = require('../services/initialsetup');
const { encrypt, decrypt } = require('../services/EncryptAndDecrypt');
async function isAuthenticated(request, reply) {
  const secretKey = 'pixivimageviewer';
  try {
    // Check if the user's refresh token is provided in the session or request header
    const encryptedToken = request.session.get('refreshToken') || request.headers['x-refresh-token'];
    const refreshToken = encryptedToken ? decrypt(encryptedToken, secretKey) : null;
    if (!refreshToken) {
      // Redirect to the login page if no refresh token is found
      reply.redirect('/login');
      return;
    }

    // Call the setupPixiv function with the user's refresh token
    const result = await setupPixiv(refreshToken);
    if (!result) {
      // Handle the case where setupPixiv returns null or fails
      //console.log('Wrong refresh token or refresh token expired');
      reply.code(400).send('Wrong refresh token or refresh token expired');
      return ;
    }

    // Set the authenticated user data in the request object for later use
    request.session.set('refreshToken', encryptedToken); // Set the refreshToken in the session
    request.user = result;
    // Continue with the request handling
  } catch (error) {
    // Redirect to the login page if there's an error
    //console.log('Error:', error);
    reply.redirect('/login');
  }
}

module.exports = isAuthenticated;
