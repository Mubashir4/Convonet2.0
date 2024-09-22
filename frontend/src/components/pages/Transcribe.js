import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Grid,
  IconButton,
  Slider,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearIcon from '@mui/icons-material/Clear';
import axios from 'axios';
import CONFIG from '../../.config';
import '../styles/Transcribe.css';
import { useTranscription } from './TranscriptionContext';

const Transcribe = ({
  setIsLoading,
  setNavigateTo,
  isRecording,
  setIsRecording,
  mediaRecorderRef,
  isLoading,
}) => {
  const {
    transcription,
    setTranscription,
    transcriptionHistory,
    setTranscriptionHistory,
  } = useTranscription();
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
  const isRecordingRef = useRef(false); // New ref to track isRecording state

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    return () => {
      stopRecording(); // Ensure microphone is stopped when component unmounts
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = () => {
    setIsRecording(true);
    isRecordingRef.current = true;
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
        if (isRecordingRef.current) {
          mediaRecorder.start();
        }
      };

      mediaRecorder.start();

      counterIntervalIdRef.current = setInterval(() => {
        setCounter((prevCounter) => prevCounter + 1);
      }, 1000);

      recordingIntervalRef.current = setInterval(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== 'inactive'
        ) {
          mediaRecorderRef.current.stop();
        }
      }, intervalTime * 1000);
    });
  };

  const stopRecording = () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    clearInterval(counterIntervalIdRef.current);
    clearInterval(recordingIntervalRef.current);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    mediaRecorderRef.current = null;
    streamRef.current = null;
  };

  const handleStopRecording = async () => {
    stopRecording();
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

      const response = await axios.post(
        `${CONFIG.SERVER_IP}/api/transcribe`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

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

    let result = '';
    for (const word of words) {
      if (!uniqueWords.has(word.toLowerCase())) {
        uniqueWords.add(word.toLowerCase());
        result += word + ' ';
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
    navigator.clipboard
      .writeText(transcription)
      .then(() => {
        setSnackbarMessage('Transcription copied to clipboard');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      })
      .catch((error) => {
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

  const handleIntervalChange = (event, newValue) => {
    setIntervalTime(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 2, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Grid container spacing={3} direction="column">
        {/* Title */}
        <Grid item>
          <Typography variant="h4" fontWeight="bold">
            Transcribe Conversations
          </Typography>
        </Grid>

        {/* Start/Stop Recording and Clear Button */}
        <Grid item>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Button
                variant="contained"
                color={isRecording ? 'error' : 'primary'}
                startIcon={isRecording ? <StopIcon /> : <MicIcon />}
                onClick={isRecording ? handleStopRecording : startRecording}
                size="large"
                sx={{ textTransform: 'none' }}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<ClearIcon />}
                onClick={handleClearTranscription}
                size="large"
                sx={{ textTransform: 'none' }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </Grid>

        {/* Recording Time */}
        {isRecording && (
          <Grid item>
            <Typography variant="h6" color="textSecondary">
              Recording Time: {counter} seconds
            </Typography>
          </Grid>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <Grid item>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CircularProgress />
              <Typography variant="h6" sx={{ ml: 2 }}>
                Processing...
              </Typography>
            </Box>
          </Grid>
        )}

        {/* Transcription TextArea and Copy Button */}
        <Grid item>
          <Box sx={{ position: 'relative' }}>
            <TextField
              inputRef={textareaRef}
              variant="outlined"
              multiline
              value={transcription}
              onChange={handleTranscriptionChange}
              placeholder="Your transcription will appear here..."
              sx={{ width: '100%', minHeight: '300px', backgroundColor: '#fff' }}
            />
            <IconButton
              onClick={handleCopyTranscription}
              sx={{ position: 'absolute', top: 8, right: 8 }}
              color="primary"
            >
              <ContentCopyIcon />
            </IconButton>
          </Box>
        </Grid>

        {/* Interval Time Settings */}
        <Grid item>
          <Typography variant="body1" gutterBottom>
            Interval Time (sec): {intervalTime}
          </Typography>
          <Slider
            value={intervalTime}
            onChange={handleIntervalChange}
            min={5}
            max={60}
            step={1}
            valueLabelDisplay="auto"
            sx={{ width: '100%' }}
          />
        </Grid>

        {/* Stop Recording Button at the End */}
        {isRecording && (
          <Grid item>
            <Button
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={handleStopRecording}
              size="large"
              fullWidth
              sx={{ textTransform: 'none' }}
            >
              Stop Recording
            </Button>
          </Grid>
        )}
      </Grid>

      {/* Snackbar */}
      <Snackbar open={snackbarOpen} autoHideDuration={2000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Transcribe;