import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import CONFIG from '../../../.config.js';

const UsersComponent = ({ users, setUsers, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) => {
  const handleUpdateUser = async (userId, updates) => {
    try {
      await axios.patch(`${CONFIG.SERVER_IP}/api/users/${userId}`, updates);
      setUsers(users.map((user) => (user._id === userId ? { ...user, ...updates } : user)));
      setSnackbarMessage('User updated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Error updating user');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${CONFIG.SERVER_IP}/api/users/${userId}`);
      setUsers(users.filter((user) => user._id !== userId));
      setSnackbarMessage('User deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Error deleting user');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <Box>
        <Typography variant="h6" sx={{ color: 'black' }}>Registered Users</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: 'black' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Role</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user._id}
                  sx={{ backgroundColor: user.user_active ? '#d4edda' : '#f8d7da' }}
                >
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateUser(user._id, { role: e.target.value === 'doctor' ? 'user' : e.target.value })}
                      style={{ color: 'black', backgroundColor: 'white', borderColor: 'black' }}
                    >
                      <option value="doctor">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={user.user_active}
                      onChange={(e) => handleUpdateUser(user._id, { user_active: e.target.checked })}
                      style={{ color: 'black' }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleDeleteUser(user._id)} color="error">
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

export default UsersComponent;
