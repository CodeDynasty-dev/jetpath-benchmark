Bun.serve({
  fetch() {
    return new Response("hello world");
  },
});
