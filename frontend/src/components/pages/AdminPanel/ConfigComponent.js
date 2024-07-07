import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Tooltip, RadioGroup, FormControlLabel, Radio, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import InfoIcon from '@mui/icons-material/Info';
import axios from 'axios';
import CONFIG from '../../../.config.js';

const ConfigComponent = ({ setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) => {
  const [nValue, setNValue] = useState('');
  const [temperature, setTemperature] = useState('');
  const [audioModel, setAudioModel] = useState('0');
  const [ec2Status, setEc2Status] = useState(null);
  const [ec2Ip, setEc2Ip] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState('');

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${CONFIG.SERVER_IP}/api/getConfig`);
      const config = response.data;
      setNValue(config.n);
      setTemperature(config.temperature);
      setAudioModel(config.audio_model);
    } catch (error) {
      console.error('Error loading configuration:', error);
      setSnackbarMessage('Error loading configuration');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const checkEc2Status = async () => {
    try {
      const response = await axios.get(`${CONFIG.SERVER_IP}/api/checkEc2Status`);
      setEc2Status(response.data.status);
      setEc2Ip(response.data.ip);
    } catch (error) {
      console.error('Error checking EC2 status:', error);
      setSnackbarMessage('Error checking EC2 status');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  useEffect(() => {
    loadConfig();
    checkEc2Status();
  }, []);

  const saveConfig = async () => {
    try {
      await axios.post(`${CONFIG.SERVER_IP}/api/saveConfig`, { n: nValue, temperature, audio_model: audioModel });
      setSnackbarMessage('Configuration saved successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Error saving configuration');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleNValueChange = (e) => {
    setNValue(e.target.value);
  };

  const handleTemperatureChange = (e) => {
    setTemperature(e.target.value);
  };

  const handleAudioModelChange = (e) => {
    setAudioModel(e.target.value);
  };

  const handleEc2Action = (action) => {
    setConfirmAction(action);
    setConfirmDialogOpen(true);
  };

  const executeEc2Action = async () => {
    setLoading(true);
    setConfirmDialogOpen(false);
    try {
      const response = await axios.post(`${CONFIG.SERVER_IP}/api/${confirmAction}Ec2`);
      setEc2Status(response.data.status);
      setEc2Ip(response.data.ip);
      setSnackbarMessage(`EC2 ${confirmAction === 'start' ? 'started' : 'stopped'} successfully`);
      setSnackbarSeverity('success');
    } catch (error) {
      setSnackbarMessage(`Failed to ${confirmAction} EC2`);
      setSnackbarSeverity('error');
    } finally {
      setLoading(false);
      setSnackbarOpen(true);
    }
  };

  return (
    <Box className="config-container">
      <Box className="config-column">
        <Typography variant="h6" sx={{ color: 'black' }}>LLM Configurations</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                label="n"
                type="number"
                value={nValue}
                onChange={handleNValueChange}
                InputLabelProps={{ shrink: true }}
                sx={{ marginRight: '10px', backgroundColor: 'white' }}
              />
              <Tooltip title="The 'n' value typically refers to the number of responses or completions the model generates for a given prompt. For example, if you set `n=3`, the model will generate three different completions for the input prompt.">
                <InfoIcon sx={{ color: 'blue' }} />
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                label="Temperature"
                type="number"
                inputProps={{ step: 0.1 }}
                value={temperature}
                onChange={handleTemperatureChange}
                InputLabelProps={{ shrink: true }}
                sx={{ marginRight: '10px', backgroundColor: 'white' }}
              />
              <Tooltip title="A lower temperature (e.g., 0.2) makes the output more focused and deterministic, while a higher temperature (e.g., 0.8) makes it more random and creative.">
                <InfoIcon sx={{ color: 'blue' }} />
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Box>
      <Box className="config-column">
        <Typography variant="h6" sx={{ color: 'black' }}>Audio Configurations</Typography>
        <RadioGroup value={audioModel} onChange={handleAudioModelChange}>
          <FormControlLabel value="0" control={<Radio sx={{ color: 'red', '&.Mui-checked': { color: 'red' } }} />} label="OpenAI Whisper" />
          <FormControlLabel value="1" control={<Radio />} label="Offline Whisper" />
        </RadioGroup>
      </Box>
      <Box className="config-column">
        <Typography variant="h6" sx={{ color: 'black' }}>EC2 Instance</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="contained"
            color={ec2Status === 'running' ? 'error' : 'success'}
            onClick={() => handleEc2Action(ec2Status === 'running' ? 'stop' : 'start')}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : ec2Status === 'running' ? 'Stop' : 'Start'}
          </Button>
          <TextField
            label="EC2 IP"
            value={ec2Ip}
            InputProps={{ readOnly: true }}
            sx={{ backgroundColor: 'white' }}
          />
        </Box>
      </Box>
      <Box className="config-save-row">
        <Button
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          onClick={saveConfig}
        >
          Save Configuration
        </Button>
      </Box>

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirm {confirmAction === 'start' ? 'Start' : 'Stop'} EC2</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {confirmAction} the EC2 instance?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={executeEc2Action} color="primary" autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConfigComponent;
