import React, { useState } from 'react';
import { Button, TextField, IconButton, Box, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { decryptData } from '../../utils/encryption';
import CONFIG from '../../../.config';

const FileUploadComponent = ({ contextDoc, setContextDoc, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) => {
  const [file, setFile] = useState(null);
  const [multipleFiles, setMultipleFiles] = useState([]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    const encryptedUser = sessionStorage.getItem('user');
    const user = encryptedUser ? decryptData(encryptedUser) : null;
    const email = user ? user.email : '';

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('email', email);
    formData.append('name', selectedFile.name);

    try {
      const response = await axios.post(`${CONFIG.SERVER_IP}/api/upload`, formData);
      setContextDoc(response.data);
      setSnackbarMessage('Document uploaded successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      const response1 = await axios.get(`${CONFIG.SERVER_IP}/api/contextDoc`, {
        params: { email }
      });
      setContextDoc(response1.data);
    } catch (error) {
      setSnackbarMessage('Error uploading document');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleMultipleFilesChange = async (e) => {
    const files = Array.from(e.target.files);
    setMultipleFiles(files);

    const encryptedUser = sessionStorage.getItem('user');
    const user = encryptedUser ? decryptData(encryptedUser) : null;
    const email = user ? user.email : '';

    let combinedContent = '';
    for (const file of files) {
      const content = await file.text();
      combinedContent += content + '\n';
    }

    const combinedFile = new Blob([combinedContent], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', combinedFile, 'MultipleFiles.txt');
    formData.append('email', email);
    formData.append('name', 'MultipleFiles.txt');

    try {
      const response = await axios.post(`${CONFIG.SERVER_IP}/api/upload`, formData);
      setContextDoc(response.data);
      setSnackbarMessage('Multiple files uploaded and concatenated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      const response1 = await axios.get(`${CONFIG.SERVER_IP}/api/contextDoc`, {
        params: { email }
      });
      setContextDoc(response1.data);
    } catch (error) {
      setSnackbarMessage('Error uploading multiple files');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${CONFIG.SERVER_IP}/api/contextDoc`);
      setContextDoc(null);
      setSnackbarMessage('Document deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Error deleting document');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <div>
      <Box sx={{ marginBottom: '20px' }}>
        <Typography variant="h6" sx={{ color: 'black' }}>Upload Context Document</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadIcon />}
            color="primary"
          >
            Upload Context Document
            <input type="file" hidden onChange={handleFileChange} />
          </Button>
          <Button
            variant="contained"
            component="label"
            startIcon={<FolderOpenIcon />}
            color="secondary"
          >
            Upload Multiple Files
            <input type="file" hidden multiple onChange={handleMultipleFilesChange} />
          </Button>
          {contextDoc && (
            <>
              <TextField
                value={`${contextDoc.name} \n ${new Date(contextDoc.updated_at).toLocaleString()}`}
                InputProps={{
                  readOnly: true,
                }}
                multiline
                overflow='auto'
                rows={2}
                variant="outlined"
                sx={{ backgroundColor: 'white', color: 'black' }}
              />
              <IconButton onClick={handleDelete} color="error">
                <DeleteIcon />
              </IconButton>
            </>
          )}
        </Box>
      </Box>
    </div>
  );
};

export default FileUploadComponent;
