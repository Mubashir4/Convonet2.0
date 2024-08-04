import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, TextField, Snackbar, Alert } from '@mui/material';
import QRCode from 'qrcode.react';
import Tesseract from 'tesseract.js';
import '../styles/ContextDocument.css';

const ContextDocument = () => {
  const [document, setDocument] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const [imageData, setImageData] = useState(null);

  useEffect(() => {
    const storedImage = localStorage.getItem('capturedImage');
    if (storedImage) {
      setImageData(storedImage);
      Tesseract.recognize(
        storedImage,
        'eng',
        {
          logger: (m) => console.log(m)
        }
      ).then(({ data: { text } }) => {
        handleTextExtracted(text);
        localStorage.removeItem('capturedImage'); // Clear the stored image after processing
      });
    }
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

  const handleQrCodeToggle = () => {
    setQrCodeVisible(!qrCodeVisible);
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
