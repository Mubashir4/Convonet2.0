import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, TextField, Snackbar, Alert, Typography, CircularProgress, FormControl, Select, MenuItem, Backdrop, IconButton } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { decryptData, encryptData } from '../utils/encryption';
import '../styles/Diagnosis.css';
import CONFIG from '../../.config';

const prompts = [
];

const MakeNotes = () => {
  const [transcription, setTranscription] = useState('');
  const [diagnosis, setDiagnosis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [selectedPrompt, setSelectedPrompt] = useState('Choose from pre-defined prompts');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [promptIndex, setPromptIndex] = useState(-1); // -1 indicates the initial run without any prompt
  const [backdropOpen, setBackdropOpen] = useState(false);
  const transcriptionRef = useRef(null);

  useEffect(() => {
    const savedTranscription = sessionStorage.getItem('transcription');
    if (savedTranscription) {
      const decryptedTranscription = decryptData(savedTranscription);
      if (decryptedTranscription) {
        setTranscription(decryptedTranscription);
        generateDiagnosis(decryptedTranscription, -1); // Initial run without any prompt
      } else {
        console.error('Failed to decrypt transcription data');
      }
    }

    const useContextDocPreference = sessionStorage.getItem('useContextDoc');
    sessionStorage.setItem('useContextDoc', useContextDocPreference !== 'false' ? 'true' : 'false');
  }, []);

  useEffect(() => {
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight;
    }
  }, [transcription]);

  const generateDiagnosis = async (text, currentPromptIndex) => {
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
    const userContext = encryptedUserContext ? decryptData(encryptedUserContext) : '';

    const prompt = currentPromptIndex >= 0 ? prompts[currentPromptIndex] : '';

    try {
      const response = await axios.post(`${CONFIG.SERVER_IP}/api/diagnose`, {
        email,
        userContext,
        transcription: text,
        useContextDoc
      });

      const encryptedResponses = response.data.responses.map(resp => encryptData(resp));
      const newResponse = response.data.responses[0];
      const newText = prompt ? `${text}\n${newResponse}\n${prompt}` : text;
      setDiagnosis(encryptedResponses);
      setCurrentIndex(encryptedResponses.length - 1);
      setTranscription(newText);
      setSnackbarMessage('Diagnosis completed successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      if (currentPromptIndex + 1 < prompts.length) {
        executePrompts(newText, currentPromptIndex + 1);
      } else {
        setBackdropOpen(false);
      }
    } catch (error) {
      console.error('Error fetching diagnosis:', error);
      setSnackbarMessage('Error fetching diagnosis');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setBackdropOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const executePrompts = (text, index) => {
    setPromptIndex(index);
    generateDiagnosis(text, index);
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

    executePrompts(transcription, 0);
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

  const handlePromptChange = (event) => {
    const value = event.target.value;
    setSelectedPrompt(value);
    if (value !== "Choose from pre-defined prompts") {
      setTranscription(value);
    }
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
          rows={2}
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
      {/* <FormControl sx={{ marginTop: 1, marginBottom: 2, backgroundColor: '#e40a1c', width: '350px', marginLeft:'100px' }}>
        <Select
          labelId="prompt-select-label"
          id="prompt-select"
          value={selectedPrompt}
          label="Choose from pre-defined prompts"
          onChange={handlePromptChange}
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: 200, // Adjust the max height as needed
                wordWrap: 'break-word'
              }
            }
          }}
        >
          <MenuItem value="Choose from pre-defined prompts" className="menu-item">Choose from pre-defined prompts</MenuItem>
          {prompts.map((prompt, index) => (
            <MenuItem key={index} value={prompt} className="menu-item">{prompt}</MenuItem>
          ))}
        </Select>
      </FormControl> */}
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
        <Typography variant="h6">Processing Prompt: {promptIndex === -1 ? "Initial Query" : promptIndex + 1}</Typography>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};

export default MakeNotes;
