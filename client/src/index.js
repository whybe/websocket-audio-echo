import pcm from "pcm-util";
// import Worker from "./wav.worker.js";

const play = document.querySelector(".play");
const stop = document.querySelector(".stop");
const sampleRateText = document.querySelector(".sample-rate");
const bufferLengthText = document.querySelector(".buffer-length");
const channelText = document.querySelector(".channel");
const sampleDelayText = document.querySelector(".sample-delay");
const initialDelayText = document.querySelector(".initial-delay");
const bufferDelayText = document.querySelector(".buffer-delay");
const networkDelayText = document.querySelector(".network-delay");
const minNetworkDelayText = document.querySelector(".min-network-delay");
const maxNetworkDelayText = document.querySelector(".max-network-delay");
const bufferMarginText = document.querySelector(".buffer-margin");
const minBufferMarginText = document.querySelector(".min-buffer-margin");
const maxBufferMarginText = document.querySelector(".max-buffer-margin");
const skipCountText = document.querySelector(".skip-count");

const bufferLength = 1024 * 2;
const numberOfChannels = 1;
const initialDelay = 50;

const audioSrcNodes = [];

const sentTimeArr = [];
let received;

let maxNetworkDelay;
let minNetworkDelay;

let maxBufferMargin;
let minBufferMargin;

let playStartedAt = 0;
let totalTimeScheduled = 0;
let skips = 0;

const audioCtx = new window.AudioContext();

sampleRateText.innerHTML = audioCtx.sampleRate + "Hz";
bufferLengthText.innerHTML = bufferLength;
channelText.innerHTML = numberOfChannels;
sampleDelayText.innerHTML =
  ((bufferLength / audioCtx.sampleRate) * 1000).toFixed(1) + "ms";
initialDelayText.innerHTML = initialDelay + "ms";

console.log("sampleRate:", audioCtx.sampleRate, "Hz");
console.log("bufferLength:", bufferLength);
console.log("numberOfChannels:", numberOfChannels);
console.log("buffer delay:", (bufferLength / audioCtx.sampleRate) * 1000, "ms");
console.log("initial delay:", initialDelay, "ms");
console.log("audioCtx.baseLatency:", audioCtx.baseLatency * 1000, "ms");

const ws = new WebSocket("ws://localhost:8080");

ws.addEventListener("open", () => {
  received = 0;
  console.log("ws open");
});
ws.addEventListener("message", async (e) => {
  const receivedTime = audioCtx.currentTime;
  const sentTime = sentTimeArr[received];
  received++;

  const networkDelay = (receivedTime - sentTime) * 1000;
  networkDelayText.innerHTML = networkDelay.toFixed(1) + "ms";

  if (maxNetworkDelay) {
    maxNetworkDelay =
      networkDelay > maxNetworkDelay ? networkDelay : maxNetworkDelay;
  } else {
    maxNetworkDelay = networkDelay;
  }
  maxNetworkDelayText.innerHTML = maxNetworkDelay.toFixed(1) + "ms";

  if (minNetworkDelay) {
    minNetworkDelay =
      networkDelay > minNetworkDelay ? minNetworkDelay : networkDelay;
  } else {
    minNetworkDelay = networkDelay;
  }
  minNetworkDelayText.innerHTML = minNetworkDelay.toFixed(1) + "ms";

  const arrayBuffer = await e.data.arrayBuffer(); // Blob -> ArrayBuffer -> Uint8Array

  const audioBuffer = pcm.toAudioBuffer(arrayBuffer, {
    context: audioCtx,
    channels: numberOfChannels,
    sampleRate: audioCtx.sampleRate,
  });
  // console.log(audioBuffer);

  const audioSrc = audioCtx.createBufferSource();
  audioSrc.onended = () => {
    // console.log("skip", skips);
    // audioSrcNodes.shift();
  };

  audioSrcNodes.push(audioSrc);

  let startDelay = 0;
  // initialize first play position.  initial clipping/choppiness sometimes occurs and intentional start latency needed
  // read more: https://github.com/WebAudio/web-audio-api/issues/296#issuecomment-257100626
  if (!playStartedAt) {
    /* this clips in Firefox, plays */
    // const startDelay = audioCtx.baseLatency || (128 / audioCtx.sampleRate);

    /* this doesn't clip in Firefox (256 value), plays */
    // startDelay = audioCtx.baseLatency || (256 / audioCtx.sampleRate);

    // 100ms allows enough time for largest 60ms Opus frame to decode
    startDelay = initialDelay / 1000;

    /* this could be useful for firefox but outputLatency is about 250ms in FF. too long */
    // startDelay =
    //   audioCtx.outputLatency ||
    //   audioCtx.baseLatency ||
    //   128 / audioCtx.sampleRate;

    playStartedAt = audioCtx.currentTime + startDelay;
  }
  const startAt = playStartedAt + totalTimeScheduled;
  totalTimeScheduled += audioBuffer.duration;

  audioSrc.buffer = audioBuffer;
  audioSrc.connect(audioCtx.destination);

  const currentTime = audioCtx.currentTime;
  if (currentTime >= startAt) {
    skips++;
    skipCountText.innerHTML = skips;
  }
  audioSrc.start(startAt);

  const bufferMargin = (startAt - currentTime) * 1000;
  bufferMarginText.innerHTML = bufferMargin.toFixed(1) + "ms";

  if (maxBufferMargin) {
    maxBufferMargin =
      bufferMargin > maxBufferMargin ? bufferMargin : maxBufferMargin;
  } else {
    maxBufferMargin = bufferMargin;
  }
  maxBufferMarginText.innerHTML = maxBufferMargin.toFixed(1) + "ms";

  if (minBufferMargin) {
    minBufferMargin =
      bufferMargin > minBufferMargin ? minBufferMargin : bufferMargin;
  } else {
    minBufferMargin = bufferMargin;
  }
  minBufferMarginText.innerHTML = minBufferMargin.toFixed(1) + "ms";
});

let prevProcessTime;
const source = audioCtx.createBufferSource();
const scriptNode = audioCtx.createScriptProcessor(
  bufferLength,
  numberOfChannels,
  numberOfChannels
);
scriptNode.onaudioprocess = (e) => {
  const audioBuffer = e.inputBuffer;
  const arrayBuffer = pcm.toArrayBuffer(audioBuffer);
  // console.log("send time");
  const currentTime = audioCtx.currentTime;
  sentTimeArr.push(currentTime);
  ws.send(arrayBuffer);

  if (prevProcessTime) {
    bufferDelayText.innerHTML =
      ((currentTime - prevProcessTime) * 1000).toFixed(1) + "ms";
  }
  prevProcessTime = currentTime;

  // console.log(audioBuffer);
  // console.log(arrayBuffer);
};

function getData() {
  const request = new XMLHttpRequest();
  request.open("GET", "viper.mp3", true);
  request.responseType = "arraybuffer";
  request.onload = () => {
    console.log("loaded");

    let audioData = request.response;

    audioCtx.decodeAudioData(
      audioData,
      (buffer) => {
        const myBuffer = buffer;
        source.buffer = myBuffer;
        // source.connect(audioCtx.destination);
      },
      (e) => {
        console.log("Error with decoding audio data" + e.error);
      }
    );
  };

  request.send();
}

play.onclick = function () {
  getData();

  source.connect(scriptNode);
  scriptNode.connect(audioCtx.destination);
  source.start();
  play.setAttribute("disabled", "disabled");
};

stop.onclick = function () {
  for (let node of audioSrcNodes) {
    node.onended = null;
    try {
      node.disconnect(audioCtx.destination);
    } catch (e) {}
    node.stop();
  }

  try {
    source.disconnect(scriptNode);
    scriptNode.disconnect(audioCtx.destination);
  } catch (e) {}
  play.removeAttribute("disabled");
};

source.onended = function () {
  source.disconnect(scriptNode);
  scriptNode.disconnect(audioCtx.destination);
  play.removeAttribute("disabled");
};
