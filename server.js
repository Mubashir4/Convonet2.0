// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const routes = require('./routes');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const TranscriptionHistory = require('./models/transcriptionHistory'); // Adjust the path as necessary

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server and integrate with Socket.IO
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((err) => {
  console.error('Error connecting to MongoDB', err);
});

// API routes
app.use('/api', routes);

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, 'frontend', 'build')));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO logic
const sessions = {};

io.on('connection', (socket) => {
  const sessionId = socket.handshake.query.sessionId;

  if (sessionId) {
    console.log(`Client connected with sessionId: ${sessionId}, socket ID: ${socket.id}`);

    // Store socket ID for the session
    if (!sessions[sessionId]) sessions[sessionId] = {};
    sessions[sessionId][socket.id] = socket;

    // Relay 'textData' events as before
    socket.on('textData', (data) => {
      console.log(`Received textData from session ${sessionId}: ${data}`);
      // Emit text data to all sockets in the session except the sender
      Object.values(sessions[sessionId]).forEach(s => {
        if (s !== socket) s.emit('textData', data);
      });
    });

    // Relay 'imageData' events
    socket.on('imageData', (data) => {
      console.log(`Received imageData from session ${sessionId}`);
      // Emit image data to all sockets in the session except the sender
      Object.values(sessions[sessionId]).forEach(s => {
        if (s !== socket) s.emit('imageData', data);
      });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      delete sessions[sessionId][socket.id];
      if (Object.keys(sessions[sessionId]).length === 0) {
        delete sessions[sessionId];
      }
    });
  }
});

// Fallback route to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});

http.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Schedule a cron job to run daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    // Find and delete records older than 30 days
    const result = await TranscriptionHistory.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });

    // Log the result
    console.log(`${result.deletedCount} transcription history records older than 30 days were deleted.`);
  } catch (error) {
    console.error('Error deleting old transcription history records:', error);
  }
});