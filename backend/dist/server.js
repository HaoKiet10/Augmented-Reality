"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const dotenv_1 = require("dotenv");
// Load environment variables
(0, dotenv_1.config)();
const server = (0, fastify_1.default)({
    logger: true,
});
// Declare a route
server.get('/', async (request, reply) => {
    return { hello: 'world' };
});
// Run the server!
const start = async () => {
    try {
        const port = process.env.PORT || 3000;
        server.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on ${server.addresses()[0]}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
