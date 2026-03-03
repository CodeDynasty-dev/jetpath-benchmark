import { serve } from "bun";

let time = { timestamp: Date.now() };

serve({
  port: 3002,
  fetch() {
    time.timestamp = Date.now();
    return Response.json(time);
  },
});
