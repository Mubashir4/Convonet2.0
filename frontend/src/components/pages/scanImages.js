// frontend/src/components/pages/ScanImages.js

import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react'; // Use named export QRCodeCanvas
import io from 'socket.io-client';
import CONFIG from '../../.config'; // Adjust the import path if necessary

// MUI Components
import {
    Container,
    Typography,
    Box,
    TextField,
    Button,
    CircularProgress,
    Paper,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearIcon from '@mui/icons-material/Clear';

const SERVER_URL = CONFIG.SERVER_IP; // Ensure it uses HTTPS

function ScanImages() {
    const [textData, setTextData] = useState('');
    const [imageProcessing, setImageProcessing] = useState(false);
    const [sessionId] = useState(() => Math.random().toString(36).substring(7));

    useEffect(() => {
        // Initialize Socket.IO client
        const socket = io(SERVER_URL, { query: { sessionId } });

        socket.on('connect', () => {
            console.log('🔗 Connected to server via WebSocket');
        });

        socket.on('connect_error', (err) => {
            console.error('❌ WebSocket Connection Error:', err.message);
        });

        // Listen for text data from the server
        socket.on('textData', (data) => {
            console.log('📥 Received text data from server');
            setImageProcessing(false);
            if (data !== 'Error during OCR processing.' && data !== 'No text detected.') {
                setTextData(prev => prev + (prev ? '\n' : '') + data.trim());
            } else {
                setTextData(prev => prev + (prev ? '\n' : '') + data);
            }
        });

        // Clean up the socket connection on component unmount
        return () => {
            socket.disconnect();
            console.log('🔌 Disconnected from server');
        };
    }, [sessionId]);

    const handleCopy = () => {
        navigator.clipboard.writeText(textData)
            .then(() => {
                alert('✅ Text copied to clipboard!');
            })
            .catch(err => {
                console.error('❌ Error copying text:', err);
                alert('Failed to copy text.');
            });
    };

    const handleClear = () => {
        setTextData('');
    };

    return (
        <Container maxWidth="md" sx={{ mt: 5 }}>
            <Paper elevation={3} sx={{ padding: 4 }}>
                <Typography variant="h4" align="center" gutterBottom>
                    📄 Image to Text Converter
                </Typography>
                <Box display="flex" justifyContent="center" mb={4}>
                    <QRCodeCanvas
                        value={`${SERVER_URL}/mobile.html?sessionId=${sessionId}`}
                        size={256}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="Q"
                        includeMargin={false}
                    />
                </Box>
                <Box mb={3}>
                    <TextField
                        label="Extracted Text"
                        multiline
                        rows={10}
                        fullWidth
                        variant="outlined"
                        value={textData}
                        InputProps={{
                            readOnly: true,
                        }}
                    />
                </Box>
                {imageProcessing && (
                    <Box display="flex" justifyContent="center" mb={2}>
                        <CircularProgress />
                        <Typography variant="body1" sx={{ ml: 2 }}>
                            Processing image...
                        </Typography>
                    </Box>
                )}
                <Box display="flex" justifyContent="center" gap={2}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<ContentCopyIcon />}
                        onClick={handleCopy}
                        disabled={!textData}
                    >
                        Copy
                    </Button>
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<ClearIcon />}
                        onClick={handleClear}
                        disabled={!textData}
                    >
                        Clear
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}

export default ScanImages;