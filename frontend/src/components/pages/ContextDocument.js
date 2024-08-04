import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, TextField, CircularProgress, Snackbar, Alert } from '@mui/material';
import QRCode from 'qrcode.react';
import Tesseract from 'tesseract.js';
import axios from 'axios';
import '../styles/ContextDocument.css';

const ContextDocument = () => {
  const [document, setDocument] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageData, setImageData] = useState(null);

  useEffect(() => {
    const checkForImage = setInterval(async () => {
      try {
        const response = await axios.get('/api/check-image');
        if (response.data.imageDataURL) {
          clearInterval(checkForImage);
          setImageData(response.data.imageDataURL);
          Tesseract.recognize(
            response.data.imageDataURL,
            'eng',
            {
              logger: (m) => console.log(m)
            }
          ).then(({ data: { text } }) => {
            handleTextExtracted(text);
            setLoading(false);
          });
        }
      } catch (error) {
        console.error('Error checking for image:', error);
      }
    }, 5000);

    return () => clearInterval(checkForImage);
  }, []);

  const handleDocumentChange = (e) => {
    setDocument(e.target.value);
  };

  const handleClear = () => {
    setDocument('');
    setSnackbarMessage('Notes cleared successfully');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleQrCodeToggle = async () => {
    setQrCodeVisible(!qrCodeVisible);
    setLoading(true);

    try {
      await axios.get('/api/start-upload');
    } catch (error) {
      console.error('Error starting upload:', error);
      setSnackbarMessage('Error starting upload');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setLoading(false);
    }
  };

  const handleTextExtracted = (text) => {
    setDocument(prevDocument => `${prevDocument}\n${text}`);
  };

  return (
    <Box className="context-document-container">
      <Typography variant="h4" className="context-document-title">ADD YOUR NOTES</Typography>
      <Box className="context-document-actions">
        <Button
          variant="contained"
          color="primary"
          onClick={handleQrCodeToggle}
          className="qr-code-button"
        >
          {qrCodeVisible ? 'Hide QR Code' : 'Show QR Code'}
        </Button>
      </Box>
      {qrCodeVisible && (
        <Box className="qr-code-container">
          <QRCode value="https://convonote.com/upload" size={256} />
        </Box>
      )}
      {loading && (
        <CircularProgress />
      )}
      <TextField
        variant="outlined"
        multiline
        fullWidth
        className="context-document-textarea"
        value={document}
        onChange={handleDocumentChange}
      />
      <Button
        variant="contained"
        color="error"
        onClick={handleClear}
        className="clear-button"
      >
        Clear
      </Button>
      <Box className="context-document-clear-button-container">
        {imageData && <img src={imageData} alt="Captured" className="uploaded-image" />}
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ContextDocument;
