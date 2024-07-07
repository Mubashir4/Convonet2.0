import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, TextField, Snackbar, Alert, FormControlLabel, Checkbox } from '@mui/material';
import { encryptData, decryptData } from '../utils/encryption';
import ImageUpload from './ImageUpload';
import '../styles/ContextDocument.css';

const ContextDocument = () => {
  const [document, setDocument] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [useContext, setUseContext] = useState(true);
  const [imageData, setImageData] = useState(null);

  useEffect(() => {
    const encryptedDocument = sessionStorage.getItem('userContext');
    const decryptedDocument = encryptedDocument ? decryptData(encryptedDocument) : '';
    setDocument(decryptedDocument);

    const useContextPreference = sessionStorage.getItem('useContextDoc');
    setUseContext(useContextPreference !== 'false');

    const params = new URLSearchParams(window.location.search);
    const image = params.get('image');
    if (image) {
      setImageData(image);
    }
  }, []);

  const handleDocumentChange = (e) => {
    const newDocument = e.target.value;
    setDocument(newDocument);
    const encryptedDocument = encryptData(newDocument);
    sessionStorage.setItem('userContext', encryptedDocument);
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

  const handleCheckboxChange = (event) => {
    setUseContext(event.target.checked);
  };

  const handleTextExtracted = (text) => {
    setDocument(prevDocument => {
      const newDocument = `${prevDocument}\n${text}`;
      const encryptedDocument = encryptData(newDocument);
      sessionStorage.setItem('userContext', encryptedDocument);
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
      <ImageUpload onTextExtracted={handleTextExtracted} /> {/* Add ImageUpload component */}
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
