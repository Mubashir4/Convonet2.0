import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, TextField, Snackbar, Alert, CircularProgress } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import axios from 'axios';
import { encryptData, decryptData } from '../utils/encryption';
import CONFIG from '../../.config';
import '../styles/Transcribe.css';
import { useTranscription } from './TranscriptionContext';

const Transcribe = ({ setIsLoading, setNavigateTo, isRecording, setIsRecording, mediaRecorderRef, isLoading }) => {
  const { transcription, setTranscription, transcriptionHistory, setTranscriptionHistory } = useTranscription();
  const [counter, setCounter] = useState(0);
  const [intervalTime, setIntervalTime] = useState(30);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const audioChunksRef = useRef([]);
  const counterIntervalIdRef = useRef(null);
  const streamRef = useRef(null);
  const textareaRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording]);

  const startRecording = () => {
    setIsRecording(true);
    setCounter(0);
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          await sendAudioChunks();
          audioChunksRef.current = [];
        }
        if (isRecording) {
          mediaRecorder.start();
        }
      };

      mediaRecorder.start();

      counterIntervalIdRef.current = setInterval(() => {
        setCounter((prevCounter) => prevCounter + 1);
      }, 1000);

      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
        }
      }, intervalTime * 1000);
    });
  };

  const stopRecording = async () => {
    setIsRecording(false);
    clearInterval(counterIntervalIdRef.current);
    clearInterval(recordingIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    mediaRecorderRef.current = null;
    streamRef.current = null;

    if (audioChunksRef.current.length > 0) {
      setIsLoading(true);
      await sendAudioChunks();
      setIsLoading(false);
    }
  };

  const sendAudioChunks = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
    audioChunksRef.current = [];

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');
      formData.append('counter', counter);

      const response = await axios.post(`${CONFIG.SERVER_IP}/api/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.error) {
        setSnackbarMessage(response.data.error);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } else {
        const transcriptionText = response.data.transcription;
        appendTranscription(transcriptionText);
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setSnackbarMessage('Error transcribing audio');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const removeRepetitions = (text) => {
    const uniqueWords = new Set();
    const words = text.split(/\b\W+\b/);

    let result = "";
    for (const word of words) {
      if (!uniqueWords.has(word.toLowerCase())) {
        uniqueWords.add(word.toLowerCase());
        result += word + " ";
      }
    }

    result = result.trim();
    return result;
  };

  const appendTranscription = (newText) => {
    newText = removeRepetitions(newText);

    setTranscription((prev) => {
      const updatedText = `${prev}\n${newText}`;
      setTranscriptionHistory(updatedText);

      // Save current cursor position
      if (textareaRef.current) {
        const { selectionStart, selectionEnd } = textareaRef.current;
        setTimeout(() => {
          textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
        }, 0);
      }

      return updatedText;
    });
  };

  const handleClearTranscription = () => {
    setTranscription('');
    setTranscriptionHistory('');
    sessionStorage.removeItem('transcription');
    sessionStorage.removeItem('transcriptionHistory');
  };

  const handleCopyTranscription = () => {
    navigator.clipboard.writeText(transcription).then(() => {
      setSnackbarMessage('Transcription copied to clipboard');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    }).catch((error) => {
      console.error('Error copying transcription:', error);
      setSnackbarMessage('Error copying transcription');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    });
  };

  const handleTranscriptionChange = (e) => {
    const newValue = e.target.value;
    setTranscription(newValue);
    setTranscriptionHistory(newValue);
  };

  const handleIntervalChange = (e) => {
    const newValue = parseInt(e.target.value, 10);
    if (newValue >= 1) {
      setIntervalTime(newValue);
    }
  };

  const increaseInterval = () => {
    setIntervalTime((prev) => prev + 1);
  };

  const decreaseInterval = () => {
    setIntervalTime((prev) => (prev - 1 >= 5 ? prev - 1 : 5));
  };

  return (
    <Box className="transcribe-container">
      <Typography variant="h4" className="transcribe-title">Transcribe Conversations</Typography>
      <Typography variant="h6" className="transcribe-counter">Recording Time: {counter} seconds</Typography>
      <Box className="transcribe-actions">
        <Button
          variant="contained"
          color="primary"
          startIcon={isRecording ? <StopIcon style={{ color: 'red' }} /> : <MicIcon />}
          onClick={isRecording ? stopRecording : startRecording}
          sx={{ marginRight: '10px' }}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
      </Box>

      {isLoading && (
        <Box className="loading-spinner">
          <CircularProgress />
          <Typography variant="h6" sx={{ marginTop: '10px' }}>Please wait...</Typography>
        </Box>
      )}

      <Button
        variant="contained"
        color="secondary"
        onClick={handleClearTranscription}
        sx={{ margin: '0 auto', backgroundColor: 'red', color: 'white' }}
      >
        Clear
      </Button>
      <Box sx={{ position: 'relative', flexGrow: 1, width: '100%' }}>
        <TextField
          inputRef={textareaRef}
          className="transcribe-textarea"
          variant="outlined"
          multiline
          value={transcription}
          onChange={handleTranscriptionChange}
          sx={{ width: '90%', height: '450px', resize: 'none', overflow: 'auto' }}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<ContentCopyIcon />}
          onClick={handleCopyTranscription}
          sx={{ position: 'absolute', top: 10, right: 10 }}
        >
          Copy
        </Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', marginTop: '10px', backgroundColor: 'white' }}>
        <Typography variant="body1" sx={{ marginRight: '10px' }}>Interval Time (sec):</Typography>
        <TextField
          type="number"
          value={intervalTime}
          onChange={handleIntervalChange}
          inputProps={{ min: 1, step: 1 }}
          sx={{ width: '100px', marginRight: '10px' }}
        />
        <Button variant="contained" onClick={increaseInterval} sx={{ marginRight: '5px' }}>▲</Button>
        <Button variant="contained" onClick={decreaseInterval}>▼</Button>
      </Box>

      <Button
        variant="contained"
        color="secondary"
        onClick={stopRecording}
        sx={{ position: 'relative', marginTop: '10px', bottom: 10, width: '20%', backgroundColor: 'red', color: 'white' }}
      >
        Stop Recording
      </Button>

      <Snackbar open={snackbarOpen} autoHideDuration={2000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Transcribe;
