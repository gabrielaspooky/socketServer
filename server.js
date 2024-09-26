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

let users = {}; // Para llevar el registro de los usuarios en la sala
let nextUserId = 1; // Contador para asignar IDs secuenciales

const emitTimerData = (room) => {
  io.to(room).emit('timer_update', timerData);
};

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  // Unirse a una sala
  socket.on('join_room', ({ room, username }) => {
    socket.join(room);
    console.log(`Cliente ${socket.id} se unió a la sala ${room} como ${username}`);

    // Asignar ID secuencial
    const userId = nextUserId++;
    
    // Registrar usuario con el nombre proporcionado
    users[socket.id] = { id: userId, username: username || `Usuario ${userId}`, room: room };
    io.to(room).emit('user_joined', Object.values(users).filter(user => user.room === room));

    socket.emit('timer_update', timerData);
  });

  // Actualizar el estado del temporizador
  socket.on('update_timer', (data) => {
    timerData = { ...timerData, ...data };
    const rooms = Object.keys(socket.rooms).filter(room => room !== socket.id);
    rooms.forEach(room => emitTimerData(room));
  });

  // Abandonar sala de manera explícita
  socket.on('leave_room', (room) => {
    socket.leave(room);
    console.log(`Cliente ${socket.id} abandonó la sala ${room}`);

    // Obtener datos del usuario que abandona antes de eliminarlo
    const userWhoLeft = users[socket.id];

    // Eliminar usuario de la sala
    delete users[socket.id];
    io.to(room).emit('user_left', userWhoLeft); // Notificar a los demás usuarios
  });

  // Manejar desconexiones
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);

    // Obtener datos del usuario que se desconectó antes de eliminarlo
    const userWhoLeft = users[socket.id];

    if (userWhoLeft) {
      // Notificar a los usuarios de la sala que este usuario se ha desconectado
      io.to(userWhoLeft.room).emit('user_left', userWhoLeft);
      delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor Socket.IO corriendo en puerto ${PORT}`);
});