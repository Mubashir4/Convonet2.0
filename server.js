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
const http = require('http'); // HTTP server
const socketIo = require('socket.io'); // Socket.IO
const { ImageAnnotatorClient } = require('@google-cloud/vision'); // Google Cloud Vision

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Google Cloud Vision client
const visionClient = new ImageAnnotatorClient({
    credentials: {
        // If using an API key, you can pass it here
        // However, it's better to use a service account for server-side applications
        // Replace 'YOUR_API_KEY' with your actual API key
        // Alternatively, set the GOOGLE_APPLICATION_CREDENTIALS environment variable to the path of your service account JSON
        // Example:
        // keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
});

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
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = socketIo(server, {
    cors: {
        origin: 'https://app.convonote.com', // Specify your client origin in production
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
        socket.on('imageData', async (data) => {
            console.log(`📷 Received imageData from Session ${sessionId}, Socket ID = ${socket.id}`);
            console.log(`📦 Image data size: ${Buffer.byteLength(data, 'utf8')} bytes`);

            try {
                // Extract base64 data from data URL
                const matches = data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
                if (!matches || matches.length !== 3) {
                    throw new Error('Invalid image data format.');
                }

                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');

                // Perform OCR using Google Cloud Vision API
                const [result] = await visionClient.textDetection({ image: { content: buffer } });
                const detections = result.textAnnotations;
                let extractedText = '';

                if (detections && detections.length > 0) {
                    extractedText = detections[0].description;
                    console.log(`📝 Extracted Text: ${extractedText}`);
                } else {
                    extractedText = 'No text detected.';
                    console.log('📝 No text detected in the image.');
                }

                // Optionally, save to transcription history
                const transcriptionRecord = new TranscriptionHistory({
                    sessionId,
                    text: extractedText,
                });

                await transcriptionRecord.save();
                console.log('💾 Saved transcription record to MongoDB.');

                // Send the extracted text back to the client
                socket.emit('textData', extractedText);
                console.log(`📤 Sent extracted text to Socket ID = ${socket.id}`);
            } catch (error) {
                console.error('❌ Error during OCR processing:', error);
                socket.emit('textData', 'Error during OCR processing.');
            }
        });

        // Handle 'textData' event (if needed)
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
server.listen(PORT, () => {
    console.log(`🚀 Server is running on https://app.convonote.com:${PORT}`);
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