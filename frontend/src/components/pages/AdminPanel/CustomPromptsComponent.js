import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, IconButton,
  Select, MenuItem, FormControl, InputLabel,
  Checkbox, FormControlLabel, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Snackbar, Alert
} from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import CONFIG from '../../../.config.js';

const CustomPromptsComponent = () => {
  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // State variables
  const [prompts, setPrompts] = useState([]);
  const [contextDocs, setContextDocs] = useState([]);
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
    temperature: 0.3, // Default temperature
  });

  // State for editing prompt
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [editPromptData, setEditPromptData] = useState({
    prompt: '',
    modelType: '',
    contextDocs: [],
    connectedAgents: [],
    transcript: false,
    userName: '',
    temperature: 0.3, // Default temperature
  });

  // State for adding connected agent
  const [isAddingConnectedAgent, setIsAddingConnectedAgent] = useState(false);
  const [connectedAgentName, setConnectedAgentName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    // Fetch all prompts
    axios.get(`${CONFIG.SERVER_IP}/api/prompts`)
      .then(response => {
        setPrompts(Array.isArray(response.data) ? response.data : []);
      })
      .catch(error => {
        console.error('Error fetching prompts:', error);
        setSnackbar({
          open: true,
          message: 'Error fetching prompts',
          severity: 'error',
        });
      });

    // Fetch all context docs
    axios.get(`${CONFIG.SERVER_IP}/api/contextDocs/all-docs`)
      .then(response => {
        setContextDocs(Array.isArray(response.data) ? response.data : []);
      })
      .catch(error => {
        console.error('Error fetching context docs:', error);
        setSnackbar({
          open: true,
          message: 'Error fetching context documents',
          severity: 'error',
        });
      });

    // Fetch all users
    axios.get(`${CONFIG.SERVER_IP}/api/users`)
      .then(response => {
        setUsers(response.data);  // Set the users state with the response data
      })
      .catch(error => {
        console.error('Error fetching users:', error);
        setSnackbar({
          open: true,
          message: 'Error fetching users',
          severity: 'error',
        });
      });
  };

  // Handler for adding a new prompt
  const handleAddPrompt = () => {
    setIsAddingPrompt(true);
    // Reset newPrompt state
    setNewPrompt({
      agentName: '',
      prompt: '',
      modelType: '',
      contextDocs: [],
      connectedAgents: [],
      transcript: false,
      userName: '',
      temperature: 0.3,
    });
    setSelectedContextDocs([]);
    setSelectedAgents([]);
    setSelectedUserName('');
  };

  // Handler for input changes in add prompt form
  const handleNewPromptChange = (e) => {
    const { name, value, checked, type } = e.target;
    let newValue = type === 'checkbox' ? checked : value;

    // For temperature, ensure it's within 0.0 to 2.0
    if (name === 'temperature') {
      newValue = parseFloat(value);
      if (isNaN(newValue)) newValue = 0.3;
      newValue = Math.min(Math.max(newValue, 0.0), 2.0);
    }

    setNewPrompt(prev => ({
      ...prev,
      [name]: newValue,
    }));
  };

  // Handler for selecting context docs
  const handleContextDocsChange = (event) => {
    const { value } = event.target;
    setSelectedContextDocs(value);
  };

  // Handler for selecting connected agents
  const handleConnectedAgentsChange = (event) => {
    const { value } = event.target;
    setSelectedAgents(value);
  };

  // Handler for saving a new prompt
  const handleSavePrompt = async () => {
    // Validate agentName uniqueness
    if (!newPrompt.agentName.trim()) {
      setSnackbar({
        open: true,
        message: 'Agent Name is required',
        severity: 'error',
      });
      return;
    }

    try {
      // Create the new prompt
      const promptToSave = {
        ...newPrompt,
        contextDocs: selectedContextDocs,
        connectedAgents: selectedAgents,
        userName: selectedUserName,
      };

      const response = await axios.post(`${CONFIG.SERVER_IP}/api/prompts`, promptToSave);
      setPrompts(prevPrompts => [...prevPrompts, response.data]);
      setSnackbar({
        open: true,
        message: 'Prompt saved successfully',
        severity: 'success',
      });
      setIsAddingPrompt(false);
    } catch (error) {
      console.error('Error saving prompt:', error.response || error.message);
      const errorMsg = error.response && error.response.data && error.response.data.msg
        ? error.response.data.msg
        : 'Error saving prompt';
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: 'error',
      });
    }
  };

  // Handler for deleting a prompt
  const handleDeletePrompt = async (id) => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) return;

    try {
      await axios.delete(`${CONFIG.SERVER_IP}/api/prompts/${id}`);
      setPrompts(prompts.filter(prompt => prompt._id !== id));
      setSnackbar({
        open: true,
        message: 'Prompt deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting prompt',
        severity: 'error',
      });
    }
  };

  // Handler for editing a prompt
  const handleEditPrompt = (prompt) => {
    setIsEditingPrompt(true);
    setEditingPrompt(prompt);
    setEditPromptData({
      prompt: prompt.prompt,
      modelType: prompt.modelType,
      contextDocs: prompt.contextDocs,
      connectedAgents: prompt.connectedAgents,
      transcript: prompt.transcript,
      userName: prompt.userName,
      temperature: prompt.temperature,
    });
  };

  // Handler for input changes in edit prompt form
  const handleEditPromptChange = (e) => {
    const { name, value, checked, type } = e.target;
    let newValue = type === 'checkbox' ? checked : value;

    // For temperature, ensure it's within 0.0 to 2.0
    if (name === 'temperature') {
      newValue = parseFloat(value);
      if (isNaN(newValue)) newValue = 0.3;
      newValue = Math.min(Math.max(newValue, 0.0), 2.0);
    }

    setEditPromptData(prev => ({
      ...prev,
      [name]: newValue,
    }));
  };

  // Handler for saving edited prompt
  const handleSaveEditedPrompt = async () => {
    if (!editingPrompt) return;

    try {
      const updatedPrompt = {
        ...editPromptData,
        contextDocs: editPromptData.contextDocs,
        connectedAgents: editPromptData.connectedAgents,
        userName: editPromptData.userName,
      };

      const response = await axios.put(`${CONFIG.SERVER_IP}/api/prompts/${editingPrompt._id}`, updatedPrompt);
      setPrompts(prompts.map(p => (p._id === editingPrompt._id ? response.data : p)));
      setSnackbar({
        open: true,
        message: 'Prompt updated successfully',
        severity: 'success',
      });
      setIsEditingPrompt(false);
      setEditingPrompt(null);
    } catch (error) {
      console.error('Error updating prompt:', error.response || error.message);
      const errorMsg = error.response && error.response.data && error.response.data.msg
        ? error.response.data.msg
        : 'Error updating prompt';
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: 'error',
      });
    }
  };

  // Handler for adding a connected agent
  const handleAddConnectedAgent = () => {
    setIsAddingConnectedAgent(true);
    setConnectedAgentName('');
  };

  // Handler for saving a new connected agent
  const handleSaveConnectedAgent = async () => {
    if (!connectedAgentName.trim()) {
      setSnackbar({
        open: true,
        message: 'Connected Agent Name is required',
        severity: 'error',
      });
      return;
    }

    try {
      // Create a new prompt for the connected agent
      const newConnectedPrompt = {
        agentName: connectedAgentName,
        prompt: 'Default prompt for ' + connectedAgentName, // Customize as needed
        modelType: 'gpt-4o-mini', // Default modelType or allow selection
        contextDocs: [],
        connectedAgents: [],
        transcript: false,
        userName: 'Default User', // Replace with appropriate user if needed
        temperature: 0.3, // Default temperature
      };

      const response = await axios.post(`${CONFIG.SERVER_IP}/api/prompts`, newConnectedPrompt);
      setPrompts(prevPrompts => [...prevPrompts, response.data]);

      // Link the new connected agent to the current editing prompt
      if (isEditingPrompt && editingPrompt) {
        const updatedConnectedAgents = [...editPromptData.connectedAgents, connectedAgentName];
        setEditPromptData(prev => ({
          ...prev,
          connectedAgents: updatedConnectedAgents,
        }));
      }

      setSnackbar({
        open: true,
        message: 'Connected Agent created and linked successfully',
        severity: 'success',
      });
      setIsAddingConnectedAgent(false);
    } catch (error) {
      console.error('Error creating connected agent:', error.response || error.message);
      const errorMsg = error.response && error.response.data && error.response.data.msg
        ? error.response.data.msg
        : 'Error creating connected agent';
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: 'error',
      });
    }
  };

  // Handler for drag and drop reordering
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const reorderedPrompts = Array.from(prompts);
    const [movedPrompt] = reorderedPrompts.splice(result.source.index, 1);
    reorderedPrompts.splice(result.destination.index, 0, movedPrompt);

    setPrompts(reorderedPrompts);

    // Extract the ordered IDs
    const orderedPromptIds = reorderedPrompts.map(prompt => prompt._id);

    // Update the order in the backend
    try {
      await axios.put(`${CONFIG.SERVER_IP}/api/prompts/reorder`, { orderedPromptIds });
      setSnackbar({
        open: true,
        message: 'Prompts reordered successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error reordering prompts:', error);
      setSnackbar({
        open: true,
        message: 'Error reordering prompts',
        severity: 'error',
      });
    }
  };

  return (
    <Box className="custom-prompts-container" sx={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>
        Admin Panel - Custom Prompts
      </Typography>

      {/* Button to add new prompt */}
      {!isAddingPrompt && !isEditingPrompt && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          color="primary"
          onClick={handleAddPrompt}
          sx={{ marginBottom: '20px', backgroundColor: '#4CAF50' }}
        >
          Add Prompt
        </Button>
      )}

      {/* Drag and Drop Context for Prompts */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="promptsDroppable">
          {(provided) => (
            <Box
              {...provided.droppableProps}
              ref={provided.innerRef}
              sx={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px' }}
            >
              {prompts.map((prompt, index) => (
                <Draggable key={prompt._id} draggableId={prompt._id} index={index}>
                  {(provided) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '15px',
                        marginBottom: '10px',
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">Prompt {index + 1}</Typography>
                        <Box>
                          <IconButton onClick={() => handleEditPrompt(prompt)} color="primary">
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDeletePrompt(prompt._id)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography variant="body1"><strong>Agent Name:</strong> {prompt.agentName}</Typography>
                      <Typography variant="body1"><strong>Model Type:</strong> {prompt.modelType}</Typography>
                      <Typography variant="body1"><strong>Prompt Text:</strong> {prompt.prompt}</Typography>
                      <Typography variant="body1"><strong>Temperature:</strong> {prompt.temperature}</Typography>
                      <Typography variant="body1"><strong>Use Transcript:</strong> {prompt.transcript ? 'Yes' : 'No'}</Typography>
                      <Typography variant="body1"><strong>Context Docs:</strong> {prompt.contextDocs.join(', ')}</Typography>
                      <Typography variant="body1"><strong>Connected Agents:</strong> {prompt.connectedAgents.join(', ')}</Typography>
                      <Typography variant="body1"><strong>User Name:</strong> {prompt.userName}</Typography>
                    </Box>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Prompt Form */}
      {isAddingPrompt && (
        <Box className="add-prompt-form" sx={{ marginTop: '40px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fafafa' }}>
          <Typography variant="h5" gutterBottom>
            Add New Prompt
          </Typography>
          <FormControl fullWidth sx={{ marginBottom: '10px' }}>
            <InputLabel>User</InputLabel>
            <Select
              value={selectedUserName}
              onChange={(e) => setSelectedUserName(e.target.value)}
              label="User"
            >
              {users.map(user => (
                <MenuItem key={user._id} value={user.email}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Agent Name */}
          <TextField
            label="Agent Name"
            name="agentName"
            value={newPrompt.agentName}
            onChange={handleNewPromptChange}
            fullWidth
            sx={{ marginBottom: '10px' }}
          />

          {/* Prompt Text */}
          <TextField
            label="Prompt Text"
            name="prompt"
            value={newPrompt.prompt}
            onChange={handleNewPromptChange}
            fullWidth
            multiline
            rows={4}
            sx={{ marginBottom: '10px' }}
          />

          {/* Temperature */}
          <TextField
            label="Temperature"
            name="temperature"
            type="number"
            inputProps={{ step: "0.1", min: "0.0", max: "2.0" }}
            value={newPrompt.temperature}
            onChange={handleNewPromptChange}
            fullWidth
            sx={{ marginBottom: '10px' }}
          />

          {/* Model Type */}
          <FormControl fullWidth sx={{ marginBottom: '10px' }}>
            <InputLabel>Model Type</InputLabel>
            <Select
              name="modelType"
              value={newPrompt.modelType}
              onChange={handleNewPromptChange}
              label="Model Type"
            >
              <MenuItem value="gpt-4o-mini">GPT-4 mini</MenuItem>
              <MenuItem value="gpt-4o">GPT-4 regular</MenuItem>
              <MenuItem value="gemini-1.5-flash">Gemini Flash 1.5</MenuItem>
              <MenuItem value="gemini-1.5-pro">Gemini Pro 1.5</MenuItem>
            </Select>
          </FormControl>

          {/* Use Transcript */}
          <FormControlLabel
            control={<Checkbox name="transcript" checked={newPrompt.transcript} onChange={handleNewPromptChange} />}
            label="Use Transcript"
            sx={{ marginBottom: '10px' }}
          />

          {/* Context Docs */}
          <FormControl fullWidth sx={{ marginBottom: '10px' }}>
            <InputLabel>Context Docs</InputLabel>
            <Select
              multiple
              value={selectedContextDocs}
              onChange={handleContextDocsChange}
              renderValue={(selected) => selected.join(', ')}
              label="Context Docs"
            >
              {contextDocs.map(doc => (
                <MenuItem key={doc._id} value={doc.name}>
                  <Checkbox checked={selectedContextDocs.includes(doc.name)} />
                  <Typography>{doc.name}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Connected Agents */}
          <FormControl fullWidth sx={{ marginBottom: '10px' }}>
            <InputLabel>Connected Agents</InputLabel>
            <Select
              multiple
              value={selectedAgents}
              onChange={handleConnectedAgentsChange}
              renderValue={(selected) => selected.join(', ')}
              label="Connected Agents"
            >
              {prompts.map(prompt => (
                <MenuItem key={prompt._id} value={prompt.agentName}>
                  <Checkbox checked={selectedAgents.includes(prompt.agentName)} />
                  <Typography>{prompt.agentName}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Button to add a new connected agent */}
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            color="secondary"
            onClick={handleAddConnectedAgent}
            sx={{ marginBottom: '20px' }}
          >
            Add Connected Agent
          </Button>

          <Box sx={{ display: 'flex', gap: '10px' }}>
            <Button
              onClick={handleSavePrompt}
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              fullWidth
            >
              Save
            </Button>
            <Button
              onClick={() => setIsAddingPrompt(false)}
              variant="outlined"
              color="secondary"
              fullWidth
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      {/* Edit Prompt Form */}
      {isEditingPrompt && editingPrompt && (
        <Box className="edit-prompt-form" sx={{ marginTop: '40px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f0f8ff' }}>
          <Typography variant="h5" gutterBottom>
            Edit Prompt - {editingPrompt.agentName}
          </Typography>
          <FormControl fullWidth sx={{ marginBottom: '10px' }}>
            <InputLabel>User</InputLabel>
            <Select
              value={editPromptData.userName}
              onChange={(e) => setEditPromptData(prev => ({ ...prev, userName: e.target.value }))}
              label="User"
            >
              {users.map(user => (
                <MenuItem key={user._id} value={user.email}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Agent Name (Read-Only) */}
          <TextField
            label="Agent Name"
            name="agentName"
            value={editingPrompt.agentName}
            fullWidth
            sx={{ marginBottom: '10px' }}
            InputProps={{
              readOnly: true,
            }}
          />

          {/* Prompt Text */}
          <TextField
            label="Prompt Text"
            name="prompt"
            value={editPromptData.prompt}
            onChange={handleEditPromptChange}
            fullWidth
            multiline
            rows={4}
            sx={{ marginBottom: '10px' }}
          />

          {/* Temperature */}
          <TextField
            label="Temperature"
            name="temperature"
            type="number"
            inputProps={{ step: "0.1", min: "0.0", max: "2.0" }}
            value={editPromptData.temperature}
            onChange={handleEditPromptChange}
            fullWidth
            sx={{ marginBottom: '10px' }}
          />

          {/* Model Type */}
          <FormControl fullWidth sx={{ marginBottom: '10px' }}>
            <InputLabel>Model Type</InputLabel>
            <Select
              name="modelType"
              value={editPromptData.modelType}
              onChange={handleEditPromptChange}
              label="Model Type"
            >
              <MenuItem value="gpt-4o-mini">GPT-4 mini</MenuItem>
              <MenuItem value="gpt-4o">GPT-4 regular</MenuItem>
              <MenuItem value="gemini-1.5-flash">Gemini Flash 1.5</MenuItem>
              <MenuItem value="gemini-1.5-pro">Gemini Pro 1.5</MenuItem>
            </Select>
          </FormControl>

          {/* Use Transcript */}
          <FormControlLabel
            control={<Checkbox name="transcript" checked={editPromptData.transcript} onChange={handleEditPromptChange} />}
            label="Use Transcript"
            sx={{ marginBottom: '10px' }}
          />

          {/* Context Docs */}
          <FormControl fullWidth sx={{ marginBottom: '10px' }}>
            <InputLabel>Context Docs</InputLabel>
            <Select
              multiple
              value={editPromptData.contextDocs}
              onChange={(e) => setEditPromptData(prev => ({ ...prev, contextDocs: e.target.value }))}
              renderValue={(selected) => selected.join(', ')}
              label="Context Docs"
            >
              {contextDocs.map(doc => (
                <MenuItem key={doc._id} value={doc.name}>
                  <Checkbox checked={editPromptData.contextDocs.includes(doc.name)} />
                  <Typography>{doc.name}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Connected Agents */}
          <FormControl fullWidth sx={{ marginBottom: '10px' }}>
            <InputLabel>Connected Agents</InputLabel>
            <Select
              multiple
              value={editPromptData.connectedAgents}
              onChange={(e) => setEditPromptData(prev => ({ ...prev, connectedAgents: e.target.value }))}
              renderValue={(selected) => selected.join(', ')}
              label="Connected Agents"
            >
              {prompts
                .filter(p => p.agentName !== editingPrompt.agentName) // Exclude self to prevent circular references
                .map(prompt => (
                  <MenuItem key={prompt._id} value={prompt.agentName}>
                    <Checkbox checked={editPromptData.connectedAgents.includes(prompt.agentName)} />
                    <Typography>{prompt.agentName}</Typography>
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {/* Button to add a new connected agent */}
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            color="secondary"
            onClick={handleAddConnectedAgent}
            sx={{ marginBottom: '20px' }}
          >
            Add Connected Agent
          </Button>

          <Box sx={{ display: 'flex', gap: '10px' }}>
            <Button
              onClick={handleSaveEditedPrompt}
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              fullWidth
            >
              Save Changes
            </Button>
            <Button
              onClick={() => setIsEditingPrompt(false)}
              variant="outlined"
              color="secondary"
              fullWidth
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      {/* Add Connected Agent Dialog */}
      <Dialog open={isAddingConnectedAgent} onClose={() => setIsAddingConnectedAgent(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Connected Agent</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter the name of the new connected agent. This will create a new prompt and link it as a connected agent.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Connected Agent Name"
            type="text"
            fullWidth
            variant="standard"
            value={connectedAgentName}
            onChange={(e) => setConnectedAgentName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddingConnectedAgent(false)}>Cancel</Button>
          <Button onClick={handleSaveConnectedAgent} variant="contained" color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomPromptsComponent;