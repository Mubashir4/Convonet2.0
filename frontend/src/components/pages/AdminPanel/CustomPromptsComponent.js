import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, IconButton,
  Select, MenuItem, FormControl, InputLabel,
  Checkbox, FormControlLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import CONFIG from '../../../.config.js';

const CustomPromptsComponent = ({ setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) => {
  const [prompts, setPrompts] = useState([]);
  const [contextDocs, setContextDocs] = useState([]);
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);  // State to hold users
  const [selectedContextDocs, setSelectedContextDocs] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    agentName: '',
    prompt: '',
    modelType: '',
    contextDocs: [],
    connectedAgents: [],
    transcript: false,
    userName: '',
  });

  useEffect(() => {
    axios.get(`${CONFIG.SERVER_IP}/api/prompts`)
      .then(response => {
        console.log(response.data[0]);
        setPrompts(Array.isArray(response.data) ? response.data : []);
      })
      .catch(error => console.error('Error fetching prompts:', error));

    axios.get(`${CONFIG.SERVER_IP}/api/contextDocs/all-docs`)
      .then(response => {
        setContextDocs(Array.isArray(response.data) ? response.data : []);
      })
      .catch(error => console.error('Error fetching context docs:', error));

      axios.get(`${CONFIG.SERVER_IP}/api/agents`)
      .then(response => {
        console.log('Fetched agents:', response.data); // Debugging line
        setAgents(Array.isArray(response.data) ? response.data : []);
      })
      .catch(error => console.error('Error fetching agents:', error));
    
    axios.get(`${CONFIG.SERVER_IP}/api/users`)
      .then(response => {
        setUsers(response.data);  // Set the users state with the response data
      })
      .catch(error => console.error('Error fetching users:', error));
  }, []);

  const handleAddPrompt = () => {
    setIsAddingPrompt(true);
  };

  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    setNewPrompt(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleDeletePrompt = async (id) => {
    try {
      await axios.delete(`${CONFIG.SERVER_IP}/api/prompts/${id}`);
      setPrompts(prompts.filter(prompt => prompt._id !== id));
      setSnackbarMessage('Prompt deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Error deleting prompt');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleContextDocsChange = (event) => {
    const { value } = event.target;
    setSelectedContextDocs(value);
  };

  const handleAgentCheckboxChange = (agentName) => {
    setSelectedAgents((prevSelected) =>
      prevSelected.includes(agentName)
        ? prevSelected.filter((name) => name !== agentName)
        : [...prevSelected, agentName]
    );
  };

  const handleAgentsChange = (event) => {
    const { value } = event.target;
    setSelectedAgents(value);
  };

  const handleSavePrompt = async () => {
    try {
      const promptToSave = {
        ...newPrompt,
        contextDocs: selectedContextDocs,
        connectedAgents: selectedAgents,
        userName: selectedUserName,
      };

      const response = await axios.post(`${CONFIG.SERVER_IP}/api/prompts`, promptToSave);
      setPrompts(prevPrompts => [...prevPrompts, response.data]);
      setSnackbarMessage('Prompt saved successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setIsAddingPrompt(false);
    } catch (error) {
      setSnackbarMessage('Error saving prompt');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <Box className="custom-prompts-container">
      <Typography variant="h6">Custom Prompts</Typography>
  
      {!isAddingPrompt ? (
        <>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            color="primary"
            onClick={handleAddPrompt}
            sx={{ marginBottom: '20px', backgroundColor: '#4CAF50' }}
          >
            Add Prompt
          </Button>
  
          <Box>
            {prompts.map((prompt, index) => (
              <Box key={prompt._id} className="custom-prompt-row" sx={{ marginBottom: '20px' }}>
                <Typography variant="h6">Prompt {index + 1}</Typography>
                <Typography variant="body1">Agent Name: {prompt.agentName}</Typography>
                <Typography variant="body1">Model Type: {prompt.modelType}</Typography>
                <Typography variant="body1">Prompt Text: {prompt.prompt}</Typography>
                <Typography variant="body1">Use Transcript: {prompt.transcript ? 'Yes' : 'No'}</Typography>
                <Typography variant="body1">Context Docs: {prompt.contextDocs.join(', ')}</Typography>
                <Typography variant="body1">Agents: {prompt.connectedAgents.join(', ')}</Typography>
                <Typography variant="body1">User Name: {prompt.userName}</Typography>
  
                <IconButton onClick={() => handleDeletePrompt(prompt._id)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Box>
        </>
      ) : (
        <Box className="add-prompt-form">
          <br/>
          <FormControl fullWidth sx={{ marginBottom: '10px' }}>
            <InputLabel>User</InputLabel>
            <Select
              value={selectedUserName}
              onChange={(e) => setSelectedUserName(e.target.value)}
            >
              {users.map(user => (
                <MenuItem key={user._id} value={user.email}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Agent Name Dropdown */}
          <FormControl fullWidth sx={{ marginBottom: '10px' }}>
          <TextField
              label="Agent Name"
              name="agentName"
              value={newPrompt.agentName}
              onChange={handleInputChange}
              fullWidth
              sx={{ marginBottom: '10px' }}
            />
          </FormControl>

          <TextField
            label="Prompt Text"
            name="prompt"
            value={newPrompt.prompt}
            onChange={handleInputChange}
            fullWidth
            sx={{ marginBottom: '10px' }}
          />
          <FormControl fullWidth sx={{ marginBottom: '10px' }}>
            <InputLabel>Model Type</InputLabel>
            <Select
              name="modelType"
              value={newPrompt.modelType}
              onChange={handleInputChange}
            >
              <MenuItem value="gpt-4o-mini">GPT-4 mini</MenuItem>
              <MenuItem value="gpt-4o">GPT-4 regular</MenuItem>
              <MenuItem value="gemini-1.5-flash">Gemini Flash 1.5</MenuItem>
              <MenuItem value="gemini-1.5-pro">Gemini Pro 1.5</MenuItem>
            </Select>
          </FormControl>

          {/* User Dropdown */}
          

          <FormControlLabel
            control={<Checkbox name="transcript" checked={newPrompt.transcript} onChange={handleInputChange} />}
            label="Use Transcript"
          />
          <FormControl fullWidth sx={{ marginBottom: '10px' }}>
            <InputLabel>Context Docs</InputLabel>
            <Select
              multiple
              value={selectedContextDocs}
              onChange={handleContextDocsChange}
            >
              {contextDocs.map(doc => (
                <MenuItem key={doc._id} value={doc.name}>
                  {doc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ marginBottom: '10px' }}>
              <Typography variant="body1">Connected Agents</Typography>
              {agents.map((agent) => (
                <FormControlLabel
                  key={agent._id}
                  control={
                    <Checkbox
                      checked={selectedAgents.includes(agent.agentName)}
                      onChange={() => handleAgentCheckboxChange(agent.agentName)}
                    />
                  }
                  label={agent.agentName}
                />
              ))}
            </FormControl>

                  <Button
                    onClick={handleSavePrompt}
                    variant="contained"
                    color="success"
                    startIcon={<SaveIcon />}
                    sx={{ marginTop: '20px' }}
                  >
                    Save
                  </Button>
        </Box>
      )}
    </Box>
  );
};

export default CustomPromptsComponent;
