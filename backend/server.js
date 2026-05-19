require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow all origins for development ease
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Port configuration
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for development
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Import API routes
const authRoutes = require('./routes/auth');
const psychometricRoutes = require('./routes/psychometric');
const scheduleRoutes = require('./routes/schedule');
const matchingRoutes = require('./routes/matching');
const socialRoutes = require('./routes/social');

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/psychometric', psychometricRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/social', socialRoutes);

// Base server endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the CampusSync Mario-Inspired Retro API!',
    status: 'Power-Up Active 🍄',
    database: 'SQLite - Normalization Complete 🏰'
  });
});

// Socket.io Real-time connection management
// Keep track of active users mapping: userId -> socketId
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] Student connected: ${socket.id}`);

  // 1. Identify user and register their socket
  socket.on('identify', (userId) => {
    if (userId) {
      activeUsers.set(parseInt(userId), socket.id);
      console.log(`[Socket] User ${userId} identified with socket ${socket.id}`);
      
      // Broadcast online status list to all connected clients
      io.emit('online_users', Array.from(activeUsers.keys()));
    }
  });

  // 2. Private real-time messaging
  socket.on('send_message', async ({ senderId, receiverId, message }) => {
    if (!senderId || !receiverId || !message || message.trim() === '') return;

    try {
      // Save chat message to database
      const result = await db.runAsync(`
        INSERT INTO chats (sender_id, receiver_id, message)
        VALUES (?, ?, ?)
      `, [senderId, receiverId, message]);

      const newChatId = result.lastID;
      
      // Fetch full message details (with timestamps and sender info)
      const chatMsg = await db.getAsync(`
        SELECT c.*, u.name AS sender_name, u.avatar AS sender_avatar
        FROM chats c
        INNER JOIN users u ON c.sender_id = u.id
        WHERE c.id = ?
      `, [newChatId]);

      // Reward sender with +2 XP for study communication
      await db.runAsync('UPDATE users SET xp = xp + 2 WHERE id = ?', [senderId]);

      // Emit to sender so their screen updates instantly
      socket.emit('receive_message', chatMsg);

      // Emit to receiver if online
      const receiverSocketId = activeUsers.get(parseInt(receiverId));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive_message', chatMsg);
        io.to(receiverSocketId).emit('new_message_notification', {
          senderId,
          senderName: chatMsg.sender_name,
          message: message.substring(0, 40) + (message.length > 40 ? '...' : '')
        });
        console.log(`[Socket] Message forwarded from user ${senderId} to user ${receiverId}`);
      } else {
        console.log(`[Socket] User ${receiverId} offline. Saved message in database.`);
      }

    } catch (err) {
      console.error('[Socket] Error saving chat message:', err);
      socket.emit('chat_error', { error: 'Failed to send message.' });
    }
  });

  // 2b. Group real-time messaging
  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`[Socket] User joined group room: group_${groupId}`);
  });

  socket.on('send_group_message', async ({ senderId, groupId, message }) => {
    if (!senderId || !groupId || !message || message.trim() === '') return;
    try {
      // Save group chat message to database
      const result = await db.runAsync(`
        INSERT INTO group_messages (group_id, sender_id, message)
        VALUES (?, ?, ?)
      `, [groupId, senderId, message]);

      const newMsgId = result.lastID;
      
      const chatMsg = await db.getAsync(`
        SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
        FROM group_messages m
        INNER JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
      `, [newMsgId]);

      // Reward sender
      await db.runAsync('UPDATE users SET xp = xp + 2 WHERE id = ?', [senderId]);

      // Broadcast to everyone in the group room
      io.to(`group_${groupId}`).emit('receive_group_message', chatMsg);
    } catch (err) {
      console.error('[Socket] Error saving group chat message:', err);
      socket.emit('chat_error', { error: 'Failed to send group message.' });
    }
  });

  // 3. User disconnects
  socket.on('disconnect', () => {
    // Find who disconnected and remove them from active map
    for (const [uid, sid] of activeUsers.entries()) {
      if (sid === socket.id) {
        activeUsers.delete(uid);
        console.log(`[Socket] User ${uid} disconnected.`);
        break;
      }
    }
    // Update online status for everyone
    io.emit('online_users', Array.from(activeUsers.keys()));
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Power-Down! An internal server error occurred.' });
});

// Start the full-stack server
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 CampusSync Server is running on port ${PORT}`);
  console.log(`🎮 theme: Retro NES Mario-Style Active`);
  console.log(`🛡️ JWT Auth protected`);
  console.log(`🏰 SQLite Active & Seeding Handled`);
  console.log(`======================================================\n`);
});
