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

const emitTimerData = (room) => {
  io.to(room).emit('timer_update', timerData);
};

const updateUsers = (room) => {
  io.to(room).emit('update_users', users);
};

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  // Unirse a una sala
  socket.on('join_room', ({ room, username }) => {
    socket.join(room);
    console.log(`Cliente ${socket.id} (${username}) se unió a la sala ${room}`);

    // Registrar usuario
    users[socket.id] = { id: socket.id, username, activity: 'esperando' };
    updateUsers(room);

    socket.emit('timer_update', timerData);
  });

  // Actualizar el estado del temporizador
  socket.on('update_timer', (data) => {
    timerData = { ...timerData, ...data };
    const rooms = Object.keys(socket.rooms).filter(room => room !== socket.id);
    rooms.forEach(room => {
      emitTimerData(room);
      // Actualizar la actividad del usuario
      if (users[socket.id]) {
        users[socket.id].activity = data.isActive ? (data.isBreak ? 'descanso' : 'pomodoro') : 'esperando';
        updateUsers(room);
      }
    });
  });

  // Abandonar sala de manera explícita
  socket.on('leave_room', ({ room, username }) => {
    socket.leave(room);
    console.log(`Cliente ${socket.id} (${username}) abandonó la sala ${room}`);

    // Eliminar usuario de la sala
    delete users[socket.id];
    updateUsers(room);
  });

  // Manejar desconexiones
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);

    // Eliminar usuario de todas las salas a las que estaba unido y notificar
    for (const room of Object.keys(socket.rooms)) {
      if (room !== socket.id) {
        delete users[socket.id];
        updateUsers(room);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor Socket.IO corriendo en puerto ${PORT}`);
});