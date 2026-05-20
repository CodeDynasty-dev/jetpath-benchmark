import { type JetRoute, Jetpath } from "jetpath";

new Jetpath({
  port: 3000,
  apiDoc: { display: false },
  cors: false,
  source: ".",
}).listen();

let time = { timestamp: Date.now() };

export const GET_: JetRoute = (ctx) => {
  time.timestamp = Date.now();
  ctx.send({time});
};
