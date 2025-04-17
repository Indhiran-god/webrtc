const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Allow both local and dummy.com for Express HTTP routes
app.use(cors({
  origin: ['http://localhost:3000', 'https://dummy-domain.com'],
  methods: ['GET', 'POST']
}));

const server = http.createServer(app);

// Allow both origins for Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://dummy-domain.com'],
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (roomID, userName) => {
    socket.join(roomID);
    
    if (!rooms.has(roomID)) {
      rooms.set(roomID, new Map());
    }

    const room = rooms.get(roomID);
    room.set(socket.id, { name: userName });

    socket.to(roomID).emit('user-joined', { id: socket.id, name: userName });

    const users = Array.from(room.entries())
      .filter(([id]) => id !== socket.id)
      .map(([id, user]) => ({ id, name: user.name }));
    socket.emit('existing-users', users);

    socket.on('signal', (data) => {
      socket.to(data.target).emit('signal', {
        from: socket.id,
        signal: data.signal,
        userName
      });
    });

    socket.on('message', (messageText) => {
      const messageData = {
        sender: userName,
        message: messageText,
        timestamp: new Date().toISOString()
      };
      io.to(roomID).emit('message', messageData);
    });

    socket.on('draw', (drawData) => {
      socket.to(roomID).emit('draw', drawData);
    });

    socket.on('disconnect', () => {
      room.delete(socket.id);
      socket.to(roomID).emit('user-left', socket.id);
      if (room.size === 0) rooms.delete(roomID);
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

