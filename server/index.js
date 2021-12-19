import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

const min = 25;
const max = 50;

const createRandomFunc = (min, max) => () => {
  const val = Math.floor(Math.random() * (max - min)) + min;
  console.log("process time", val, "ms");
  return val;
};
const randomLate = createRandomFunc(min, max);

let count;
wss.on("connection", (ws) => {
  count = 0;
  console.log("connected");

  ws.on("message", (data, isBinary) => {
    data.size;
    count++;
    // console.log("received seq", count);

    setTimeout(() => {
      ws.send(data, { binary: isBinary });
    }, randomLate());
  });
});
