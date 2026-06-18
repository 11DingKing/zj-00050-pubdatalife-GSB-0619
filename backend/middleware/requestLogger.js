const requestLogger = (fastify) => {
  fastify.addHook("onRequest", (request, reply, done) => {
    const startTime = Date.now();
    request.log.info({
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    }, "Incoming request");

    reply.raw.on("finish", () => {
      const duration = Date.now() - startTime;
      request.log.info({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: duration,
      }, "Request completed");
    });

    done();
  });
};

module.exports = { requestLogger };
