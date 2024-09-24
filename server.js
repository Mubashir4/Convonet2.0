// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from the React frontend app (build folder)
app.use(express.static(path.join(__dirname, 'frontend', 'build')));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = socketIo(server, {
    cors: {
        origin: 'https://app.convonote.com',
        methods: ['GET', 'POST'],
    },
});

// Socket.IO connection handling
const sessions = {};

io.on('connection', (socket) => {
    const sessionId = socket.handshake.query.sessionId;

    if (sessionId) {
        console.log(`🔗 Client connected: Session ID = ${sessionId}, Socket ID = ${socket.id}`);

        if (!sessions[sessionId]) {
            sessions[sessionId] = {};
        }

        sessions[sessionId][socket.id] = socket;

        socket.on('imageData', async (data) => {
            console.log(`📷 Received imageData from Session ${sessionId}, Socket ID = ${socket.id}`);
            console.log(`📦 Image data size: ${Buffer.byteLength(data, 'utf8')} bytes`);

            try {
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

                // Send the cleaned text back to the client
                socket.emit('textData', cleanedText);
                console.log(`📤 Sent cleaned text to Socket ID = ${socket.id}`);
            } catch (error) {
                console.error('❌ Error during OCR processing:', error.message);
                socket.emit('textData', 'Error during OCR processing.');
            }
        });

        socket.on('textData', (data) => {
            console.log(`📝 Received textData from Session ${sessionId}, Socket ID = ${socket.id}: ${data}`);

            Object.keys(sessions[sessionId]).forEach((id) => {
                if (id !== socket.id) {
                    sessions[sessionId][id].emit('textData', data);
                    console.log(`📤 Relayed textData to Socket ID = ${id}`);
                }
            });
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: Session ID = ${sessionId}, Socket ID = ${socket.id}`);
            delete sessions[sessionId][socket.id];

            if (Object.keys(sessions[sessionId]).length === 0) {
                delete sessions[sessionId];
                console.log(`🗑️ Session ${sessionId} has no more connected sockets and was deleted.`);
            }
        });

    } else {
        console.log(`⚠️ Connection attempt without sessionId. Socket ID = ${socket.id}`);
        socket.disconnect();
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

/**
 * Function to clean text by removing all non-English alphabets and symbols.
 * Keeps only English letters, numbers, spaces, and basic punctuation.
 * @param {string} text - The text to be cleaned.
 * @returns {string} - The cleaned text.
 */
function cleanText(text) {
    return text.replace(/[^A-Za-z0-9 .,!?'"()-]/g, '');
}