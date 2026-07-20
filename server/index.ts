import { createServer } from "http";
import { createApp } from "./app";
import { setupVite, log } from "./vite";

const port = Number(process.env.PORT) || 5000;

const app = await createApp({ serveStatic: process.env.NODE_ENV === "production" });
const server = createServer(app);

if (process.env.NODE_ENV !== "production") {
  await setupVite(app, server);
}

server.listen(port, "0.0.0.0", () => {
  log(`serving on port ${port}`);
});
