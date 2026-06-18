const { collaborationService } = require("../services/collaborationService");
const { todoService, statisticsService } = require("../services/todoService");

const collaborationRoutes = async (fastify, options) => {
  fastify.get("/todos", async (request, reply) => {
    const { dept_id } = request.query;
    const todos = todoService.getTodos(dept_id);
    return { todos };
  });

  fastify.get("/collaborations", async (request, reply) => {
    const records = collaborationService.getAllRecords();
    return { records };
  });

  fastify.post("/collaborations/:id/urge", async (request, reply) => {
    const result = collaborationService.urgeCollaboration(request.params.id);
    return result;
  });
};

module.exports = collaborationRoutes;
