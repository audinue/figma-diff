import { createFigmaDiffServerFromEnv } from "./server";

const port = Number(process.env.PORT ?? "3000");
const server = createFigmaDiffServerFromEnv({ port });

console.log(`Figma diff server running at ${server.url}`);
