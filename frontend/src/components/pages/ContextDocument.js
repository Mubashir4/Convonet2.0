import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, TextField, Snackbar, Alert } from '@mui/material';
import ImageUpload from './ImageUpload';
import '../styles/ContextDocument.css';
import CONFIG from '../../.config'; // Import the configuration

const ContextDocument = () => {
  const [document, setDocument] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [useContext, setUseContext] = useState(true);
  const [imageData, setImageData] = useState(null);

  useEffect(() => {
    const savedDocument = sessionStorage.getItem('userContext');
    setDocument(savedDocument || '');

    const useContextPreference = sessionStorage.getItem('useContextDoc');
    setUseContext(useContextPreference !== 'false');

    const params = new URLSearchParams(window.location.search);
    const image = params.get('image');
    if (image) {
      setImageData(image);
    }

    const client = new WebSocket(CONFIG.WB_SERVER_IP);

    client.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.image) {
        setImageData(`${CONFIG.SERVER_IP}/public/${data.image}`);
      }
    };

    return () => {
      client.close();
    };
  }, []);

  const handleDocumentChange = (e) => {
    const newDocument = e.target.value;
    setDocument(newDocument);
    sessionStorage.setItem('userContext', newDocument);
  };

  const handleClear = () => {
    setDocument('');
    sessionStorage.removeItem('userContext');
    setSnackbarMessage('Notes cleared successfully');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleTextExtracted = (text) => {
    setDocument(prevDocument => {
      const newDocument = `${prevDocument}\n${text}`;
      sessionStorage.setItem('userContext', newDocument);
      return newDocument;
    });
  };

  return (
    <Box className="context-document-container">
      <Typography variant="h4" className="context-document-title">ADD YOUR NOTES</Typography>
      <Box className="context-document-actions">
        {/* Remove or disable Save button as required */}
        {/* <Button
          variant="contained"
          color="secondary"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={true} // Disable instead of removing if needed
        >
          Save
        </Button> */}
      </Box>
      <Button
          variant="contained"
          color="error"
          onClick={handleClear}
          className="clear-button"
        >
          Clear
        </Button>
      <TextField
        variant="outlined"
        multiline
        fullWidth
        className="context-document-textarea"
        value={document}
        onChange={handleDocumentChange}
      />
      <Box className="context-document-clear-button-container">
        {imageData && <img src={imageData} alt="Captured" />}
        <ImageUpload onTextExtracted={handleTextExtracted} />
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
