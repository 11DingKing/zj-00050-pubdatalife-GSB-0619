class AppError extends Error {
  constructor(message, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

class NotFoundError extends AppError {
  constructor(message = "资源不存在") {
    super(message, 404, "NOT_FOUND");
  }
}

class ValidationError extends AppError {
  constructor(message = "参数校验失败") {
    super(message, 400, "VALIDATION_ERROR");
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "未授权访问") {
    super(message, 401, "UNAUTHORIZED");
  }
}

class ForbiddenError extends AppError {
  constructor(message = "无权限访问") {
    super(message, 403, "FORBIDDEN");
  }
}

const errorHandler = (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error({
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    }, "Request error");

    if (error.isOperational) {
      return reply.code(error.statusCode).send({
        error: error.message,
        code: error.code,
      });
    }

    if (error.validation) {
      return reply.code(400).send({
        error: "参数校验失败",
        code: "VALIDATION_ERROR",
        details: error.validation,
      });
    }

    return reply.code(500).send({
      error: "服务器内部错误",
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: "接口不存在",
      code: "NOT_FOUND",
      path: request.url,
    });
  });
};

module.exports = {
  errorHandler,
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
};
