import "fastify";

// Extend Fastify instance with our custom decorators
declare module "fastify" {
  interface FastifyInstance {
    cache: import("../cache/cache.js").CacheService;
    repo: import("../db/repository.js").Repository | null;
  }
}
