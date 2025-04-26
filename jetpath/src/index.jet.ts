import { type JetFunc, Jetpath } from "jetpath";

new Jetpath({ port: 3000 }).listen();

export const GET_: JetFunc = (ctx) => {
  ctx.send("hello world");
};
