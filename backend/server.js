const fastify = require('fastify')({ logger: true });

// Define a route
fastify.get('/', async (request, reply) => {
  return { message: 'Backend is running with Fastify!' };
});

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 5000 });
    console.log('Server is running on http://localhost:5000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();