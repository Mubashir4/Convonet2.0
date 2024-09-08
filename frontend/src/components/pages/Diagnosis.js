import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, TextField, Snackbar, Alert, Typography, CircularProgress, Backdrop, IconButton } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { decryptData, encryptData } from '../utils/encryption';
import '../styles/Diagnosis.css';
import CONFIG from '../../.config';
import { useTranscription } from './TranscriptionContext'; // Import the context hook

const MakeNotes = () => {
  const { transcription, setTranscription, transcriptionHistory, setTranscriptionHistory } = useTranscription();
  const [diagnosis, setDiagnosis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const transcriptionRef = useRef(null);

  useEffect(() => {
    // Set userContext to empty string when entering the page
    sessionStorage.setItem('userContext', encryptData(''));

    const savedTranscription = sessionStorage.getItem('transcription');
    if (savedTranscription) {
      const decryptedTranscription = decryptData(savedTranscription);
      if (decryptedTranscription) {
        //setTranscription(decryptedTranscription);
        generateDiagnosis(decryptedTranscription); // Initial run without any prompt
      } else {
        console.error('Failed to decrypt transcription data');
      }
    }

    const useContextDocPreference = sessionStorage.getItem('useContextDoc');
    sessionStorage.setItem('useContextDoc', useContextDocPreference !== 'false' ? 'true' : 'false');

    return () => {
      // Set userContext to empty string when leaving the page
      sessionStorage.setItem('userContext', encryptData(''));
    };
  }, []);

  useEffect(() => {
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight;
    }
  }, [transcription]);

  const generateDiagnosis = async (text) => {
    setLoading(true);
    setBackdropOpen(true);
    const encryptedUser = sessionStorage.getItem('user');
    const user = encryptedUser ? decryptData(encryptedUser) : null;
    const username = user.name
    const email = user ? user.email : '';
    if (!email) {
      console.error('User email is not available');
      setSnackbarMessage('User email is not available');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setLoading(false);
      setBackdropOpen(false);
      return;
    }

    const useContextDocPreference = sessionStorage.getItem('useContextDoc');
    const useContextDoc = useContextDocPreference !== 'false';

    const encryptedUserContext = sessionStorage.getItem('userContext');
    const userContext = encryptedUserContext ? decryptData(encryptedUserContext) : '';
    try {
      const response = await axios.post(`${CONFIG.SERVER_IP}/api/diagnose`, {
        email,
        userContext,
        transcription: text,
        useContextDoc
      });
      
      const encryptedResponses = response.data.responses.map(resp => encryptData(resp));
      const newResponse = response.data.responses[0];
      const newText = `${text}\n${newResponse}`;
      setDiagnosis(encryptedResponses);
      setCurrentIndex(encryptedResponses.length - 1);
      //setTranscription(newText);
      setSnackbarMessage('Diagnosis completed successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setBackdropOpen(false);
    } catch (error) {
      console.error('Error fetching Notes:', error);
      setSnackbarMessage('Error fetching Notes', error);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setBackdropOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnosis = () => {
    const previousTranscription = sessionStorage.getItem('transcription');
    const encryptedUserContext = sessionStorage.getItem('userContext');
    let userContext = encryptedUserContext ? decryptData(encryptedUserContext) : '';

    if (previousTranscription) {
      const decryptedPreviousTranscription = decryptData(previousTranscription);
      userContext += `\n${decryptedPreviousTranscription}`;
    }

    const currentDiagnosis = diagnosis[currentIndex] ? decryptData(diagnosis[currentIndex]).trim() : '';
    if (currentDiagnosis) {
      userContext += `\n${currentDiagnosis}`;
    }

    sessionStorage.setItem('userContext', encryptData(userContext));
    sessionStorage.setItem('transcription', encryptData(transcription));

    generateDiagnosis(transcription);
    setTranscription('');
  };

  const handleCopyToClipboard = () => {
    const diagnosisTextElement = document.querySelector('.ai-diagnosis-textfield');
    if (diagnosisTextElement) {
      const range = document.createRange();
      range.selectNodeContents(diagnosisTextElement);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('copy');
      setSnackbarMessage('Diagnosis copied to clipboard');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } else {
      setSnackbarMessage('Failed to copy diagnosis');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handlePreviousResponse = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextResponse = () => {
    if (currentIndex < diagnosis.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleClearTranscription = () => {
    setTranscription('');
    sessionStorage.removeItem('transcription');
  };

  return (
    <Box className="diagnosis-container">
      <Typography variant="h4" className="diagnosis-title">
        Make Notes Page
      </Typography>
      <Box className="transcription-container">
        <AccountCircleIcon className="user-icon" />
        <TextField
          inputRef={transcriptionRef}
          variant="outlined"
          multiline
          fullWidth
          rows={6}
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
          className="diagnosis-textfield"
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleDiagnosis}
          className="diagnosis-button"
          disabled={loading}
          sx={{ marginLeft: '20px' }}
        >
          {loading ? <CircularProgress size={24} /> : 'Make Notes'}
        </Button>
        <IconButton
          onClick={handleClearTranscription}
          color="secondary"
          sx={{ marginLeft: '10px' }}
        >
          <DeleteIcon />
        </IconButton>
      </Box>
      <Typography variant="body1" sx={{ marginTop: '10px', color: 'white' }}>
        Response {currentIndex + 1} of {diagnosis.length}
      </Typography>
      <Box className="diagnosis-textarea-wrapper">
        <Button onClick={handlePreviousResponse} disabled={currentIndex === 0}><ArrowBackIcon /></Button>
        <Box className="ai-diagnosis-textfield">
          <pre style={{ whiteSpace: 'pre-wrap', overflowY: 'auto' }}>{diagnosis.length > 0 ? decryptData(diagnosis[currentIndex]) : ''}</pre>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyToClipboard}
            sx={{ position: 'absolute', top: 10, right: 10 }}
          >
            Copy
          </Button>
        </Box>
        <Button onClick={handleNextResponse} disabled={currentIndex === diagnosis.length - 1}><ArrowForwardIcon /></Button>
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
      <Backdrop open={backdropOpen} style={{ color: '#fff', zIndex: 1000 }}>
        <Typography variant="h6">Processing</Typography>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};

export default MakeNotes;
