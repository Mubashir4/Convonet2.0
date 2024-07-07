// SettingsComponent.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Switch, FormControlLabel } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import axios from 'axios';
import CONFIG from '../../../.config.js';

const SettingsComponent = ({ setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) => {
  const [openAIKey, setOpenAIKey] = useState('');
  const [whisperServer, setWhisperServer] = useState(false);
  const [llmServer, setLlmServer] = useState(false);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${CONFIG.SERVER_IP}/api/getConfig`);
      const settings = response.data;
      setOpenAIKey(settings.openAIKey);
      setWhisperServer(settings.whisperServer);
      setLlmServer(settings.llmServer);
    } catch (error) {
      console.error('Error loading settings:', error);
      setSnackbarMessage('Error loading settings');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async () => {
    try {
      await axios.post(`${CONFIG.SERVER_IP}/api/saveConfig`, {
        openAIKey,
        whisperServer,
        llmServer
      });
      setSnackbarMessage('Settings saved successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Error saving settings');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <Box className="settings-container">
      <Typography variant="h6" sx={{ color: 'black' }}>Settings</Typography>
      <Box sx={{ marginBottom: '20px', width: '100%' }}>
        <TextField
          label="OpenAI Key"
          value={openAIKey}
          onChange={(e) => setOpenAIKey(e.target.value)}
          fullWidth
          multiline
          sx={{ backgroundColor: 'white' }}
        />
      </Box>
      <Box sx={{ marginBottom: '20px' }}>
        <FormControlLabel
          control={
            <Switch
              checked={whisperServer}
              onChange={(e) => setWhisperServer(e.target.checked)}
              color="primary"
            />
          }
          label="Turn on Whisper Server"
        />
      </Box>
      <Box sx={{ marginBottom: '20px' }}>
        <FormControlLabel
          control={
            <Switch
              checked={llmServer}
              onChange={(e) => setLlmServer(e.target.checked)}
              color="primary"
            />
          }
          label="Turn on LLM Server"
        />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          onClick={saveSettings}
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default SettingsComponent;
