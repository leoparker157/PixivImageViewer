const isAuthenticated = require('../middleware/isAuthenticated');
/**
 * Handles adding and deleting of illust bookmarks.
 * @param {Object} fastify - The fastify instance.
 * @param {Object} request - The request object.
 */
async function AddAndDelete(fastify, request) {
    fastify.addHook('preHandler', isAuthenticated);

    const { getillustBookmarkAdd, illustBookmarkDelete } = require('../services/mainFunction.js');

    /**
     * Adds an illust bookmark.
     * @param {Object} request - The request object.
     * @param {Object} reply - The reply object.
     */
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

    /**
     * Deletes an illust bookmark.
     * @param {Object} request - The request object.
     * @param {Object} reply - The reply object.
     */
    fastify.post('/deleteillustbookmark', async (request, reply) => {
        const { pixiv, options, Pixiv } = request.user;
        options.illustId = request.body.illustId;

        try {
            let response = await illustBookmarkDelete(pixiv, options);
            reply.send({ success: response });
        } catch (err) {
            reply.send({ success: false });
        }
    });
}
module.exports = AddAndDelete;
