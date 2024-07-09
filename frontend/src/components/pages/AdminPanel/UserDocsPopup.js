import React, { useState, useEffect } from 'react';
import { Box, Modal, Typography, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';
import CONFIG from '../../../.config.js';

const UserDocsPopup = ({ open, onClose, user, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) => {
  const [associatedDocs, setAssociatedDocs] = useState([]);
  const [unassociatedDocs, setUnassociatedDocs] = useState([]);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const userDocsResponse = await axios.get(`${CONFIG.SERVER_IP}/api/userDocAssociations/${user.email}`);
        const contextDocsResponse = await axios.get(`${CONFIG.SERVER_IP}/api/contextDocs`);

        const activeDocs = contextDocsResponse.data.filter(doc => doc.active);
        const associatedDocs = userDocsResponse.data;
        const associatedDocIds = new Set(associatedDocs.map(doc => doc._id.toString()));
        const unassociatedDocs = activeDocs.filter(doc => !associatedDocIds.has(doc._id.toString()));

        setAssociatedDocs(associatedDocs.filter(doc => doc.active)); // Ensure only active associated docs
        setUnassociatedDocs(unassociatedDocs);
      } catch (error) {
        console.error('Error fetching documents:', error);
      }
    };

    if (user) {
      fetchDocs();
    }
  }, [user]);

  const handleAddDoc = async (docId) => {
    try {
      await axios.post(`${CONFIG.SERVER_IP}/api/userDocAssociations`, { useremail: user.email, doc_id: docId });
      setSnackbarMessage('Document added successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      const updatedUnassociatedDocs = unassociatedDocs.filter(doc => doc._id !== docId);
      const addedDoc = unassociatedDocs.find(doc => doc._id === docId);
      setUnassociatedDocs(updatedUnassociatedDocs);
      setAssociatedDocs([...associatedDocs, addedDoc]);
    } catch (error) {
      setSnackbarMessage('Error adding document');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleRemoveDoc = async (docId) => {
    try {
      await axios.delete(`${CONFIG.SERVER_IP}/api/userDocAssociations`, { data: { useremail: user.email, doc_id: docId } });
      setSnackbarMessage('Document removed successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      const updatedAssociatedDocs = associatedDocs.filter(doc => doc._id !== docId);
      const removedDoc = associatedDocs.find(doc => doc._id === docId);
      setAssociatedDocs(updatedAssociatedDocs);
      setUnassociatedDocs([...unassociatedDocs, removedDoc]);
    } catch (error) {
      setSnackbarMessage('Error removing document');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ width: 800, margin: 'auto', marginTop: '10%', backgroundColor: 'white', padding: 4 }}>
        <Typography variant="body1">Name: {user.name}</Typography>
        <Typography variant="body1">Email: {user.email}</Typography>

        <Box sx={{ display: 'flex', marginTop: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Unassociated Documents</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {unassociatedDocs.map((doc) => (
                    <TableRow key={doc._id}>
                      <TableCell>{doc.name}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleAddDoc(doc._id)} color="primary">
                          <AddIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          <Box sx={{ flex: 1, marginLeft: 2 }}>
            <Typography variant="h6">Associated Documents</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {associatedDocs.map((doc) => (
                    <TableRow key={doc._id} sx={{ backgroundColor: '#d4edda' }}>
                      <TableCell>{doc.name}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleRemoveDoc(doc._id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
        <Button variant="contained" color="secondary" onClick={onClose} sx={{ marginTop: 2 }}>
          Close
        </Button>
      </Box>
    </Modal>
  );
};

export default UserDocsPopup;
