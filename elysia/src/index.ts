import { Elysia } from "elysia";

const time = { timestamp: Date.now() };

const app = new Elysia()
  .get("/", () => {
    time.timestamp = Date.now();
    return time;
  })
  .listen(3001);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
