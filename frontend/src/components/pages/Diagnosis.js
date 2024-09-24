// MakeNotes.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Snackbar,
  Alert,
  Typography,
  CircularProgress,
  Backdrop,
  IconButton,
  Grid,
  Tooltip,
  Button,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { decryptData, encryptData } from '../utils/encryption';
import '../styles/Diagnosis.css';
import CONFIG from '../../.config';
import { useTranscription } from './TranscriptionContext';
import ReactMarkdown from 'react-markdown';

const MakeNotes = () => {
  const {
    transcription,
    setTranscription,
    transcriptionHistory,
    setTranscriptionHistory,
  } = useTranscription();
  const [diagnosis, setDiagnosis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [backdropOpen, setBackdropOpen] = useState(false);

  useEffect(() => {
    // Initialize user context and transcription
    sessionStorage.setItem('userContext', encryptData(''));
    const savedTranscription = sessionStorage.getItem('transcription');
    if (savedTranscription) {
      const decryptedTranscription = decryptData(savedTranscription);
      if (decryptedTranscription) {
        generateDiagnosis(decryptedTranscription);
      } else {
        console.error('Failed to decrypt transcription data');
      }
    }

    const useContextDocPreference = sessionStorage.getItem('useContextDoc');
    sessionStorage.setItem(
      'useContextDoc',
      useContextDocPreference !== 'false' ? 'true' : 'false'
    );

    return () => {
      // Cleanup
      sessionStorage.setItem('userContext', encryptData(''));
    };
  }, []);

  const generateDiagnosis = async (text) => {
    setLoading(true);
    setBackdropOpen(true);
    const encryptedUser = sessionStorage.getItem('user');
    const user = encryptedUser ? decryptData(encryptedUser) : null;
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
    const userContext = encryptedUserContext
      ? decryptData(encryptedUserContext)
      : '';
    try {
      const response = await axios.post(`${CONFIG.SERVER_IP}/api/diagnose`, {
        email,
        userContext,
        transcription: text,
        useContextDoc,
      });

      const encryptedResponses = response.data.responses.map((resp) =>
        encryptData(resp)
      );
      setDiagnosis(encryptedResponses);
      setCurrentIndex(encryptedResponses.length - 1);
      setSnackbarMessage('Notes generated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setBackdropOpen(false);
    } catch (error) {
      console.error('Error fetching Notes:', error);
      setSnackbarMessage('Error fetching Notes');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setBackdropOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    const currentDiagnosis = diagnosis[currentIndex]
      ? decryptData(diagnosis[currentIndex])
      : '';
    navigator.clipboard.writeText(currentDiagnosis).then(
      () => {
        setSnackbarMessage('Notes copied to clipboard');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      },
      () => {
        setSnackbarMessage('Failed to copy notes');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    );
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

  return (
    <Box className="diagnosis-container">
      <Typography variant="h4" className="diagnosis-title">
        Make Notes
      </Typography>
      <Grid container spacing={2} alignItems="flex-start">
        {/* Diagnosis Output */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ marginTop: '20px' }}>
          </Typography>
          {/* Copy Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyToClipboard}
            disabled={diagnosis.length === 0}
            className="copy-button"
          >
            Copy
          </Button>
          <Box className="diagnosis-textarea-wrapper">
            <Grid container spacing={1} alignItems="center">
              <Grid item>
                <Tooltip title="Previous Note">
                  <span>
                    <IconButton
                      onClick={handlePreviousResponse}
                      disabled={currentIndex === 0}
                    >
                      <ArrowBackIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Grid>
              <Grid item xs>
                <Box className="ai-diagnosis-textfield">
                  {diagnosis.length > 0 ? (
                    <ReactMarkdown>{decryptData(diagnosis[currentIndex])}</ReactMarkdown>
                  ) : (
                    <Typography variant="body1" color="textSecondary">
                      No notes generated yet.
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid item>
                <Tooltip title="Next Note">
                  <span>
                    <IconButton
                      onClick={handleNextResponse}
                      disabled={currentIndex === diagnosis.length - 1}
                    >
                      <ArrowForwardIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Grid>
            </Grid>
          </Box>
          {/* Notes Counter */}
          {diagnosis.length > 0 && (
            <Typography variant="caption" sx={{ marginTop: '10px', display: 'block' }}>
              Note {currentIndex + 1} of {diagnosis.length}
            </Typography>
          )}
        </Grid>
      </Grid>

      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Backdrop with Loading Indicator */}
      <Backdrop open={backdropOpen} style={{ color: '#fff', zIndex: 1300 }}>
        <CircularProgress color="inherit" />
        <Typography variant="h6" sx={{ marginLeft: '10px' }}>
          Generating Notes...
        </Typography>
      </Backdrop>
    </Box>
  );
};

export default MakeNotes;