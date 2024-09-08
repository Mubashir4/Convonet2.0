import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Button, Input } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import CONFIG from '../../../.config.js';
import { decryptData } from '../../utils/encryption';
import '../../ContextDocsComponent.css';


const ContextDocsComponent = ({ contextDocs = [], setContextDocs, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) => {
  const [files, setFiles] = useState([]);

  const fetchContextDocs = async () => {
    try {
      const response = await axios.get(`${CONFIG.SERVER_IP}/api/contextDocs`);
      setContextDocs(response.data);
    } catch (error) {
      console.error('Error fetching context documents:', error);
    }
  };

  useEffect(() => {
    fetchContextDocs(); // Fetch data when the component is mounted
  }, []);

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleFileUpload = async () => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    const encryptedUser = sessionStorage.getItem('user');
    const user = encryptedUser ? decryptData(encryptedUser) : null;
    const email = user ? user.email : '';

    formData.append('email', email); // Add email to form data

    try {
      await axios.post(`${CONFIG.SERVER_IP}/api/contextDocs/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSnackbarMessage('Files uploaded successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      fetchContextDocs(); // Refresh the context docs list
    } catch (error) {
      setSnackbarMessage('Error uploading files');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleUpdateContextDoc = async (contextDocId, updates) => {
    const encryptedUser = sessionStorage.getItem('user');
    const user = encryptedUser ? decryptData(encryptedUser) : null;
    const email = user ? user.email : '';

    try {
      await axios.patch(`${CONFIG.SERVER_IP}/api/contextDocs/${contextDocId}`, { ...updates, email });
      setContextDocs(contextDocs.map((doc) => (doc._id === contextDocId ? { ...doc, ...updates } : doc)));
      setSnackbarMessage('Document updated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Error updating document');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleDeleteContextDoc = async (contextDocId) => {
    const encryptedUser = sessionStorage.getItem('user');
    const user = encryptedUser ? decryptData(encryptedUser) : null;
    const email = user ? user.email : '';

    try {
      await axios.delete(`${CONFIG.SERVER_IP}/api/contextDocs/${contextDocId}`, { data: { email } });
      setContextDocs(contextDocs.filter((doc) => doc._id !== contextDocId));
      setSnackbarMessage('Document deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      fetchContextDocs(); // Refresh the context docs list
    } catch (error) {
      setSnackbarMessage('Error deleting document');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <Box>
      <Typography variant="h2" className="context-docs-header">Context Documents</Typography>
      <Box className="context-docs-upload">
        <Input type="file" multiple onChange={handleFileChange} />
        <Button variant="contained" color="primary" onClick={handleFileUpload} className="context-docs-upload-button">Upload Files</Button>
      </Box>
      <TableContainer component={Paper} className="context-docs-table">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Time of Upload</TableCell>
              <TableCell>Active Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(contextDocs) && contextDocs.map((doc) => (
              <TableRow key={doc._id} className={doc.active ? 'active-doc-row' : 'inactive-doc-row'}>
                <TableCell>{doc.name}</TableCell>
                <TableCell>{new Date(doc.updated_at).toLocaleString()}</TableCell>
                <TableCell>
                  <input type="checkbox" checked={doc.active} onChange={(e) => handleUpdateContextDoc(doc._id, { active: e.target.checked })} />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleDeleteContextDoc(doc._id)} className="context-docs-delete-button">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ContextDocsComponent;
