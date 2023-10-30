//app.js
const path = require('path');
const fastify = require('fastify')();
const socketio= require('fastify-socket.io');
const fastifySession = require('@fastify/session');
const fastifyCookie = require('@fastify/cookie');
const { fs } = require('./services/initialsetup');
// Create a new instance of the Pixiv class
//session
fastify.register(fastifyCookie);
fastify.register(require('@fastify/secure-session'), {
  // the name of the attribute decorated on the request-object, defaults to 'session'
  sessionName: 'session',
  // the name of the session cookie, defaults to value of sessionName
  cookieName: 'my-session-cookie',
  // adapt this to point to the directory where secret-key is located
  key: fs.readFileSync(path.join(__dirname, 'secret-key')),
  cookie: {
    path: '/',
    secure: true,
    httpOnly: true,
    // options for setCookie, see https://github.com/fastify/fastify-cookie
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
})
////
fastify.register(socketio);

fastify.register(require('@fastify/formbody'))
fastify.register(require('@fastify/view'), {
  
  engine: {
    pug: require('pug'),
  },
  includeViewExtension: true,
  templates: path.join(__dirname, 'views'),
});

// Serve bootstrap css/js files from 'public' directory
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/public/',
  decorateReply: false // don't decorate reply for this one
});

// Serve image files from 'pixiv' directory
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname),
  prefix: '/static/',
  setReply: true // now we can set sendFile decorator for this one.
});

// Register the login plugin
fastify.register(require('./routes/indexpage'));
fastify.register(require('./routes/bookmarkedpage'));
fastify.register(require('./routes/recommendedpage'));
fastify.register(require('./routes/user'));
fastify.register(require('./routes/loginpage'));
fastify.register(require('./routes/AddAndDelete'));
fastify.register(require('./routes/IllustPage'));
fastify.register(require('./routes/rankingpage'));
fastify.register(require('./routes/latestillust'));
fastify.register(require('./routes/relatedIllusts'));


// Define your routes
//fastify.register(require('./services/initialsetup'));



// fastify.get('/login', async (req, reply) => {
//   return reply.view('loginpage.pug');
// });


// ... (other code remains unchanged)

// Start the server
const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log('Server is running on http://localhost:3000');
    } catch (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
};

start();