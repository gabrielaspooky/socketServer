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
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`Cliente ${socket.id} se unió a la sala ${room}`);

    // Asignar ID secuencial
    const userId = nextUserId++;
    
    // Registrar usuario
    users[socket.id] = { id: userId, name: `User ${userId}` };
    io.to(room).emit('user_joined', users);

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

    // Eliminar usuario de todas las salas a las que estaba unido y notificar
    for (const room of Object.keys(socket.rooms)) {
      if (room !== socket.id) { // Evitar que elimine del propio socket id (que no es una sala)
        delete users[socket.id];
        io.to(room).emit('user_left', userWhoLeft);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor Socket.IO corriendo en puerto ${PORT}`);
});
