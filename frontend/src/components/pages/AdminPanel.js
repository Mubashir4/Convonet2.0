import React, { useState, useEffect } from 'react';
import { Box, Typography, Snackbar, Alert, ToggleButton, ToggleButtonGroup } from '@mui/material';
import axios from 'axios';
import ContextDocsComponent from './AdminPanel/ContextDocsComponent';
import ConfigComponent from './AdminPanel/ConfigComponent';
import CustomPromptsComponent from './AdminPanel/CustomPromptsComponent';
import UsersComponent from './AdminPanel/UsersComponent';
import KeysComponent from './AdminPanel/KeysComponent';
import CONFIG from '../../.config';
import '../styles/AdminPanel.css';

const AdminPanel = () => {
  const [contextDocs, setContextDocs] = useState([]);
  const [users, setUsers] = useState([]);
  const [nValue, setNValue] = useState(10);
  const [temperature, setTemperature] = useState(0.2);
  const [audioModel, setAudioModel] = useState('0');
  const [prompts, setPrompts] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [selectedSection, setSelectedSection] = useState('users');

  useEffect(() => {
    const fetchContextDocs = async () => {
      try {
        const response = await axios.get(`${CONFIG.SERVER_IP}/api/contextDocs`);
        setContextDocs(response.data);
      } catch (error) {
        console.error('Error fetching context documents:', error);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${CONFIG.SERVER_IP}/api/users`);
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    const fetchConfig = async () => {
      try {
        const response = await axios.get(`${CONFIG.SERVER_IP}/api/getConfig`);
        setNValue(response.data.n);
        setTemperature(response.data.temperature);
        setAudioModel(response.data.audio_model);
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };

    const fetchPrompts = async () => {
      try {
        const response = await axios.get(`${CONFIG.SERVER_IP}/api/prompts`);
        setPrompts(response.data);
      } catch (error) {
        console.error('Error fetching prompts:', error);
      }
    };

    fetchContextDocs();
    fetchUsers();
    fetchConfig();
    fetchPrompts();
  }, []);

  const handleSectionChange = (event, newSection) => {
    setSelectedSection(newSection);
  };

  return (
    <Box sx={{ padding: '20px', backgroundColor: 'white', color: 'black', minHeight: '100vh', overflow: 'auto' }}>
      <Typography variant="h4" align="center" gutterBottom>Admin Panel</Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <ToggleButtonGroup
          value={selectedSection}
          exclusive
          color="primary"
          onChange={handleSectionChange}
          aria-label="Admin Panel Sections"
        >
          <ToggleButton
            value="users"
            aria-label="Registered Users"
            sx={{
              backgroundColor: 'grey.900',
              color: 'white',
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
              },
              '&:hover': {
                backgroundColor: 'grey.800',
              },
            }}
          >
            Registered Users
          </ToggleButton>
          <ToggleButton
            value="upload"
            aria-label="Upload Context"
            sx={{
              backgroundColor: 'grey.900',
              color: 'white',
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
              },
              '&:hover': {
                backgroundColor: 'grey.800',
              },
            }}
          >
            Upload Context
          </ToggleButton>
          <ToggleButton
            value="prompts"
            aria-label="Prompts"
            sx={{
              backgroundColor: 'grey.900',
              color: 'white',
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
              },
              '&:hover': {
                backgroundColor: 'grey.800',
              },
            }}
          >
            Prompts
          </ToggleButton>
          <ToggleButton
            value="config"
            aria-label="Configuration"
            sx={{
              backgroundColor: 'grey.900',
              color: 'white',
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
              },
              '&:hover': {
                backgroundColor: 'grey.800',
              },
            }}
          >
            Configuration
          </ToggleButton>
          
        </ToggleButtonGroup>
      </Box>

      {selectedSection === 'users' && (
        <UsersComponent
          users={users}
          setUsers={setUsers}
          setSnackbarMessage={setSnackbarMessage}
          setSnackbarSeverity={setSnackbarSeverity}
          setSnackbarOpen={setSnackbarOpen}
        />
      )}

      {selectedSection === 'upload' && (
        <ContextDocsComponent
          contextDocs={contextDocs}
          setContextDocs={setContextDocs}
          setSnackbarMessage={setSnackbarMessage}
          setSnackbarSeverity={setSnackbarSeverity}
          setSnackbarOpen={setSnackbarOpen}
        />
      )}

      {selectedSection === 'prompts' && (
        <CustomPromptsComponent
          prompts={prompts}
          setPrompts={setPrompts}
          setSnackbarMessage={setSnackbarMessage}
          setSnackbarSeverity={setSnackbarSeverity}
          setSnackbarOpen={setSnackbarOpen}
        />
      )}

      {selectedSection === 'config' && (
        <ConfigComponent
          nValue={nValue}
          setNValue={setNValue}
          temperature={temperature}
          setTemperature={setTemperature}
          setSnackbarMessage={setSnackbarMessage}
          setSnackbarSeverity={setSnackbarSeverity}
          setSnackbarOpen={setSnackbarOpen}
        />
      )}

      {selectedSection === 'keys' && (
        <KeysComponent
          setSnackbarMessage={setSnackbarMessage}
          setSnackbarSeverity={setSnackbarSeverity}
          setSnackbarOpen={setSnackbarOpen}
        />
      )}

      <Snackbar open={snackbarOpen} autoHideDuration={2000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPanel;
