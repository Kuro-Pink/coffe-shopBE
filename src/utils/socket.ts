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

      // Allow host, admin, and staff
      if (!['host', 'admin', 'staff'].includes(user.role)) {
        return next(new Error('Unauthorized role'));
      }

      // Attach user info to socket
      socket.userRole = user.role;
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

    // ✅ ADMIN
    if (socket.userRole === 'admin') {
      socket.join('admins');
      console.log('📍 Admin joined room: admins');
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

// Emit new order to host
export const emitNewOrder = (storeId: string, order: any) => {
  try {
    const io = getIO();
    io.to(`store:${storeId}`).emit('new_order', order);
    console.log(`🔔 New order emitted to store: ${storeId}`);
  } catch (error) {
    console.error('Error emitting new order:', error);
  }
};

// Emit order status update
export const emitOrderStatusUpdate = (storeId: string, order: any) => {
  try {
    const io = getIO();
    io.to(`store:${storeId}`).emit('order_status_update', order);
    console.log(`📝 Order status update emitted to store: ${storeId}`);
  } catch (error) {
    console.error('Error emitting order status update:', error);
  }
};
