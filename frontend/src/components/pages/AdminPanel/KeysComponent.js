import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import axios from 'axios';
import CONFIG from '../../../.config';

const KeysComponent = ({ setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) => {
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const response = await axios.get(`${CONFIG.SERVER_IP}/api/keys`);
        setOpenaiApiKey(response.data.OPENAI_API_KEY || '');
        setGeminiApiKey(response.data.GEMINI_API_KEY || '');
      } catch (error) {
        console.error('Error fetching keys:', error);
        setSnackbarMessage('Error fetching keys');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    };
    fetchKeys();
  }, [setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

  const saveKeys = async () => {
    try {
      await axios.post(`${CONFIG.SERVER_IP}/api/keys`, {
        OPENAI_API_KEY: openaiApiKey,
        GEMINI_API_KEY: geminiApiKey
      });
      setSnackbarMessage('Keys updated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Error updating keys');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <Box>
      <Typography variant="h6">API Keys</Typography>
      <TextField
        label="OpenAI API Key"
        value={openaiApiKey}
        onChange={(e) => setOpenaiApiKey(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Gemini API Key"
        value={geminiApiKey}
        onChange={(e) => setGeminiApiKey(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button variant="contained" color="primary" onClick={saveKeys}>
        Save Keys
      </Button>
    </Box>
  );
};

export default KeysComponent;
