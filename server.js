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
const Tesseract = require('tesseract.js'); // Tesseract.js for OCR
const sharp = require('sharp'); // For image preprocessing

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

                // Preprocess image using Sharp
                const processedBuffer = await sharp(buffer)
                    .resize(1024, 1024, {
                        fit: 'inside',
                        withoutEnlargement: true,
                    })
                    .grayscale()
                    .normalize()
                    .toBuffer();

                // Perform OCR using Tesseract.js
                console.log('🖼️ Starting OCR processing with Tesseract.js...');
                const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
                    logger: m => console.log(`Tesseract.js: ${m.status} (${Math.round(m.progress * 100)}%)`)
                });
                console.log('✅ OCR processing completed.');

                // Clean the extracted text
                const cleanedText = cleanText(text);
                console.log(`📝 Cleaned Text: ${cleanedText}`);

                // Optionally, save to transcription history
                const transcriptionRecord = new TranscriptionHistory({
                    sessionId,
                    text: cleanedText,
                });

                await transcriptionRecord.save();
                console.log('💾 Saved transcription record to MongoDB.');

                // Send the cleaned text back to the client
                socket.emit('textData', cleanedText);
                console.log(`📤 Sent cleaned text to Socket ID = ${socket.id}`);
            } catch (error) {
                console.error('❌ Error during OCR processing:', error.message);
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

/**
 * Function to clean text by removing all non-English alphabets and symbols.
 * Keeps only English letters, numbers, spaces, and basic punctuation.
 * @param {string} text - The text to be cleaned.
 * @returns {string} - The cleaned text.
 */
function cleanText(text) {
    // Remove all characters that are not English letters, numbers, spaces, or basic punctuation
    return text.replace(/[^A-Za-z0-9 .,!?'"()-]/g, '');
}