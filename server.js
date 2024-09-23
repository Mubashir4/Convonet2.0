// server.js

require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const routes = require('./routes'); // Your API routes
const bodyParser = require('body-parser');
const cron = require('node-cron');
const TranscriptionHistory = require('./models/transcriptionHistory'); // Your Mongoose model
const fs = require('fs'); // For optional file operations

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
app.use(bodyParser.json()); // Parse JSON bodies (redundant with express.json())
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((err) => {
  console.error('❌ Error connecting to MongoDB:', err);
});

// API routes
app.use('/api', routes); // Mount your API routes at /api

// Serve static files from 'public' directory (e.g., mobile.html)
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from the React frontend app (build folder)
app.use(express.static(path.join(__dirname, 'frontend', 'build')));

// Create HTTP server
const http = require('http').createServer(app);

// Initialize Socket.IO with CORS settings
const io = require('socket.io')(http, {
  cors: {
    origin: '*', // 🔒 In production, specify your client origin(s) for enhanced security
    methods: ['GET', 'POST'],
  },
});

// Socket.IO connection handling
const sessions = {}; // Object to keep track of sessions and connected sockets

io.on('connection', (socket) => {
  const sessionId = socket.handshake.query.sessionId; // Retrieve sessionId from query parameters

  if (sessionId) {
    console.log(`🔗 Client connected: Session ID = ${sessionId}, Socket ID = ${socket.id}`);

    // Initialize session if it doesn't exist
    if (!sessions[sessionId]) {
      sessions[sessionId] = {};
    }

    // Store the socket in the session
    sessions[sessionId][socket.id] = socket;

    // Handle 'imageData' event
    socket.on('imageData', (data) => {
      console.log(`📷 Received imageData from Session ${sessionId}, Socket ID = ${socket.id}`);
      console.log(`📦 Image data size: ${Buffer.byteLength(data, 'utf8')} bytes`);

      // Optional: Save image data to a file for debugging (Uncomment to enable)
      /*
      const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const timestamp = Date.now();
      fs.writeFile(`uploads/image_${timestamp}.png`, buffer, (err) => {
        if (err) {
          console.error('❌ Error saving image file:', err);
        } else {
          console.log('✅ Image file saved successfully.');
        }
      });
      */

      // Relay imageData to other sockets in the same session
      Object.keys(sessions[sessionId]).forEach((id) => {
        if (id !== socket.id) { // Don't send back to sender
          sessions[sessionId][id].emit('imageData', data);
          console.log(`📤 Relayed imageData to Socket ID = ${id}`);
        }
      });
    });

    // Handle 'textData' event
    socket.on('textData', (data) => {
      console.log(`📝 Received textData from Session ${sessionId}, Socket ID = ${socket.id}: ${data}`);

      // Relay textData to other sockets in the same session
      Object.keys(sessions[sessionId]).forEach((id) => {
        if (id !== socket.id) { // Don't send back to sender
          sessions[sessionId][id].emit('textData', data);
          console.log(`📤 Relayed textData to Socket ID = ${id}`);
        }
      });
    });

    // Handle socket disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: Session ID = ${sessionId}, Socket ID = ${socket.id}`);
      delete sessions[sessionId][socket.id]; // Remove socket from session

      // If no more sockets in the session, delete the session
      if (Object.keys(sessions[sessionId]).length === 0) {
        delete sessions[sessionId];
        console.log(`🗑️ Session ${sessionId} has no more connected sockets and was deleted.`);
      }
    });

  } else {
    console.log(`⚠️ Connection attempt without sessionId. Socket ID = ${socket.id}`);
    socket.disconnect(); // Disconnect sockets without a sessionId
  }
});

// Fallback route to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});

// Start the HTTP server
http.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

// Schedule a cron job to run daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    // Find and delete records older than 30 days
    const result = await TranscriptionHistory.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });

    // Log the result
    console.log(`🗑️ ${result.deletedCount} transcription history records older than 30 days were deleted.`);
  } catch (error) {
    console.error('❌ Error deleting old transcription history records:', error);
  }
});