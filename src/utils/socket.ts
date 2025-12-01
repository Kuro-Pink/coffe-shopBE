// src/utils/socket.ts
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer;

export const initSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Join store room (for host to receive orders)
    socket.on('join-store', (storeId: string) => {
      socket.join(`store-${storeId}`);
      console.log(`Host joined store room: ${storeId}`);
    });

    // Leave store room
    socket.on('leave-store', (storeId: string) => {
      socket.leave(`store-${storeId}`);
      console.log(`Host left store room: ${storeId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Emit new order to store
export const emitNewOrder = (storeId: string, order: any) => {
  if (io) {
    io.to(`store-${storeId}`).emit('new-order', order);
  }
};

// Emit order status update
export const emitOrderUpdate = (storeId: string, order: any) => {
  if (io) {
    io.to(`store-${storeId}`).emit('order-updated', order);
  }
};