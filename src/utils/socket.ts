import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface AuthSocket extends SocketServer {
  userId?: string;
  storeId?: string;
}

let io: SocketServer;

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      
      // Get user
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('User not found'));
      }

      // Only host can connect
      if (user.role !== 'host') {
        return next(new Error('Only hosts can connect to socket'));
      }

      // Attach user info to socket
      socket.userId = user._id.toString();
      socket.storeId = user.storeId?.toString();

      console.log(`✅ Host connected: ${user.email} (Store: ${socket.storeId})`);
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: any) => {
    console.log(`📡 Socket connected: ${socket.id}`);

    // Join store room
    if (socket.storeId) {
      socket.join(`store:${socket.storeId}`);
      console.log(`📍 Host joined room: store:${socket.storeId}`);
    }

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`📡 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Emit when ANY order changes (create / update / cancel)
export const emitOrdersChanged = (storeId: string) => {
  const io = getIO();
  io.to(`store:${storeId}`).emit('orders_changed');
};
