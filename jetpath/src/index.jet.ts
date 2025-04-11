import { type JetFunc, JetPath } from "jetpath";

new JetPath({ port: 3000 }).listen();

export const GET_: JetFunc = (ctx) => {
  ctx.send("hello world");
};
