import { createServer } from 'http';
import { Server } from 'socket.io';
import { Chess } from 'chess.js';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();
const playerRooms = new Map();

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on("createRoom", () => {
    const roomId = Math.random().toString(36).substring(7);
    const room = {
      id: roomId,
      players: {},
      game: new Chess(),
      spectators: []
    };
    rooms.set(roomId, room);
    console.log('Room created:', roomId);
    socket.join(roomId);
    socket.emit("roomCreated", roomId);
  });

  socket.on("joinRoom", (roomId) => {
    console.log('Attempting to join room:', roomId);
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("error", "Room not found");
      return;
    }

    const currentFen = room.game.fen();

    if (!room.players.white) {
      room.players.white = socket.id;
      playerRooms.set(socket.id, roomId);
      socket.join(roomId);
      socket.emit("playerJoined", { 
        color: "white", 
        playerId: socket.id, 
        fen: currentFen,
        orientation: "white"
      });
    } else if (!room.players.black) {
      room.players.black = socket.id;
      playerRooms.set(socket.id, roomId);
      socket.join(roomId);
      
      // Send game state to the new black player
      socket.emit("playerJoined", { 
        color: "black", 
        playerId: socket.id, 
        fen: currentFen,
        orientation: "black"
      });
      
      // Update white player about black joining
      socket.to(room.players.white).emit("playerJoined", {
        color: "black",
        playerId: socket.id,
        fen: currentFen,
        orientation: "white"
      });
    } else {
      room.spectators.push(socket.id);
      socket.join(roomId);
      socket.emit("joinedAsSpectator", { fen: currentFen });
    }
  });

  socket.on("move", ({ from, to, roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const isWhite = room.players.white === socket.id;
    const isBlack = room.players.black === socket.id;
    if (!isWhite && !isBlack) return;

    if ((isWhite && room.game.turn() === 'w') || (isBlack && room.game.turn() === 'b')) {
      try {
        const move = room.game.move({ from, to, promotion: 'q' });
        if (move) {
          io.to(roomId).emit("moveMade", { 
            from, 
            to, 
            fen: room.game.fen(),
            turn: room.game.turn()
          });
        }
      } catch (e) {
        console.error("Invalid move", e);
      }
    }
  });

  socket.on("disconnect", () => {
    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        if (room.players.white === socket.id) {
          room.players.white = undefined;
        } else if (room.players.black === socket.id) {
          room.players.black = undefined;
        } else {
          room.spectators = room.spectators.filter(id => id !== socket.id);
        }

        if (!room.players.white && !room.players.black && room.spectators.length === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit("playerLeft", socket.id);
        }
      }
      playerRooms.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});