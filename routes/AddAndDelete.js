const isAuthenticated = require('../middleware/isAuthenticated');
async function AddAndDelete(fastify, request) {
fastify.addHook('preHandler', isAuthenticated)
const {getillustBookmarkAdd,illustBookmarkDelete} = require('../services/mainFunction.js');
fastify.post('/addillustbookmark', async (request, reply) => {
    const { pixiv, options, Pixiv } = request.user;
    options.illustId = request.body.illustId;
    try {
        let response = await getillustBookmarkAdd(pixiv, options);
        reply.send({ success: response });
    } catch (err) {
        reply.send({ success: false });
    }
});

fastify.post('/deleteillustbookmark', async (request, reply) => {
    const { pixiv, options, Pixiv } = request.user;
    options.illustId = request.body.illustId;
    try {
        let response = await illustBookmarkDelete(pixiv, options);
        reply.send({ success: response});
    } catch (err) {
        reply.send({ success: false });
    }
});
}
module.exports = AddAndDelete;
