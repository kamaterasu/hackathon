const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let initialTime = 0;    // in seconds, what “Set” last asked for
let currentTime = 0;    // remaining seconds
let timerInterval = null;
let isRunning = false;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/api/set', (req, res) => {
  const { time } = req.body; // expected seconds
  if (typeof time === 'number' && time >= 0) {
    initialTime = time;
    currentTime = time;
    broadcastTime();
    return res.sendStatus(200);
  }
  res.status(400).send('Invalid time');
});

app.post('/api/start', (req, res) => {
  if (!isRunning) startTimer();
  res.sendStatus(200);
});

app.post('/api/pause', (req, res) => {
  pauseTimer();
  res.sendStatus(200);
});

app.post('/api/reset', (req, res) => {
  currentTime = initialTime;
  broadcastTime();
  res.sendStatus(200);
});

io.on('connection', socket => {
  socket.emit('time', currentTime);
});

function broadcastTime() {
  io.emit('time', currentTime);
}

function startTimer() {
  isRunning = true;
  timerInterval = setInterval(() => {
    if (currentTime > 0) {
      currentTime--;
      broadcastTime();
    } else {
      pauseTimer();
    }
  }, 1000);
}

function pauseTimer() {
  isRunning = false;
  clearInterval(timerInterval);
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🕒 Countdown server running at http://localhost:${PORT}`);
});

