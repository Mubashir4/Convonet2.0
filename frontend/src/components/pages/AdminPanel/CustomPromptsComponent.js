import React from 'react';
import { Box, Typography, Button, TextField, IconButton, Switch, FormControlLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import CONFIG from '../../../.config.js';

const CustomPromptsComponent = ({ prompts, setPrompts, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) => {
  const handleAddPrompt = () => {
    const newPrompt = { _id: Date.now().toString(), text: '', modelType: 'GPT' };
    setPrompts([...prompts, newPrompt]);
  };

  const handlePromptChange = (id, text) => {
    setPrompts(prompts.map((prompt) => (prompt._id === id ? { ...prompt, text } : prompt)));
  };

  const handleModelTypeChange = (id, modelType) => {
    setPrompts(prompts.map((prompt) => (prompt._id === id ? { ...prompt, modelType } : prompt)));
  };

  const handleSavePrompts = async () => {
    try {
      const response = await axios.post(`${CONFIG.SERVER_IP}/api/prompts`, { prompts });
      setPrompts(response.data);
      setSnackbarMessage('Prompts saved successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Error saving prompts');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleDeletePrompt = async (id) => {
    try {
      await axios.delete(`${CONFIG.SERVER_IP}/api/prompts/${id}`);
      setPrompts(prompts.filter((prompt) => prompt._id !== id));
      setSnackbarMessage('Prompt deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Error deleting prompt');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <Box sx={{ marginBottom: '20px' }}>
      <Typography variant="h6" sx={{ color: 'black' }}>Add Custom Prompts</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '10px' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          color="primary"
          onClick={handleAddPrompt}
        >
          Add Prompt
        </Button>
      </Box>
      {prompts.map((prompt, index) => (
        <Box key={prompt._id} sx={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <FormControlLabel
            control={
              <Switch
                  checked={prompt.modelType === 'Gemini'}
                  onChange={(e) => handleModelTypeChange(prompt._id, e.target.checked ? 'Gemini' : 'GPT')}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: 'primary.main',
                    },
                    '& .MuiSwitch-switchBase': {
                      color: 'success.main',
                    },
                  }}
                />
            }
            label={prompt.modelType === 'Gemini' ? 'Gemini' : 'GPT'}
            sx={{ minWidth: '120px', marginRight: '5px' }} // Set fixed width for the label
          />
          <TextField
            label={`Prompt ${index + 1}`}
            value={prompt.text}
            onChange={(e) => handlePromptChange(prompt._id, e.target.value)}
            sx={{ flex: 1 }}
          />
          <IconButton onClick={() => handleDeletePrompt(prompt._id)} color="error">
            <DeleteIcon />
          </IconButton>
        </Box>
      ))}
      <Button
        variant="contained"
        color="success"
        startIcon={<SaveIcon />}
        onClick={handleSavePrompts}
      >
        Save Prompts
      </Button>
    </Box>
  );
};

export default CustomPromptsComponent;
