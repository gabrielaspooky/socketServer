const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Cambia esto a tu dominio de producción si es necesario
    methods: ["GET", "POST"]
  }
});

let timerData = {
  minutes: 25,
  seconds: 0,
  isActive: false,
  isBreak: false
};

// Emitir estado del temporizador a todos los clientes en la sala
const emitTimerData = (room) => {
  io.to(room).emit('timer_update', timerData);
};

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  // Unirse a una sala
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`Cliente ${socket.id} se unió a la sala ${room}`);
    socket.emit('timer_update', timerData);
  });

  // Actualizar el estado del temporizador
  socket.on('update_timer', (data) => {
    timerData = { ...timerData, ...data };
    // Emitir la actualización a todos los clientes en la sala
    const rooms = Object.keys(socket.rooms).filter(room => room !== socket.id);
    rooms.forEach(room => emitTimerData(room));
  });

  // Manejar desconexiones
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor Socket.IO corriendo en puerto ${PORT}`);
});
