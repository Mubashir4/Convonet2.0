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

// Serve the upload.html file
app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'routes', 'upload.html'));
});

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, 'frontend', 'build')));

// Socket.IO logic
const sessions = {};

io.on('connection', (socket) => {
  const sessionId = socket.handshake.query.sessionId;

  if (sessionId) {
    // Store socket ID for the session
    if (!sessions[sessionId]) sessions[sessionId] = {};
    sessions[sessionId][socket.id] = socket;

    socket.on('textData', (data) => {
      // Emit text data to all sockets in the session
      Object.values(sessions[sessionId]).forEach(s => {
        if (s !== socket) s.emit('textData', data);
      });
    });

    socket.on('disconnect', () => {
      delete sessions[sessionId][socket.id];
      if (Object.keys(sessions[sessionId]).length === 0) {
        delete sessions[sessionId];
      }
    });
  }
});



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
