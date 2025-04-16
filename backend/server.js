const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config(); // Optional, if using .env file

const app = express();
const server = http.createServer(app);

// Define allowed origin based on environment
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigin = isProduction 
  ? process.env.PROD_CLIENT_URL || 'https://your-production-domain.com' 
  : '*';

// Initialize Socket.IO server with appropriate CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
    credentials: !isProduction ? false : true,
  }
});

// Track which room each socket is in
const userRoomMap = {};

io.on('connection', (socket) => {
  console.log(`New user connected: ${socket.id}`);

  socket.on('join-room', (roomID) => {
    socket.join(roomID);
    userRoomMap[socket.id] = roomID;

    socket.to(roomID).emit('user-joined', socket.id);

    socket.on('signal', (data) => {
      io.to(data.target).emit('signal', {
        from: socket.id,
        signal: data.signal
      });
    });

    socket.on('disconnect', () => {
      const roomID = userRoomMap[socket.id];
      if (roomID) {
        socket.to(roomID).emit('user-disconnected', socket.id);
        delete userRoomMap[socket.id];
      }
      console.log(`User disconnected: ${socket.id}`);
    });
  });
});

// Use env or fallback to port 5000
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Signaling server running at http://localhost:${PORT}`);
});
