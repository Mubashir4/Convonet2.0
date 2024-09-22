import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';
import '../styles/NewPassword.css';
import CONFIG from '../../.config';

const NewPassword = () => {
  const [password, setPassword] = useState('');
  const { token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${CONFIG.SERVER_IP}/api/new-password`, { password, token });
      alert('Your password has been reset successfully.');
      navigate('/login');
    } catch (error) {
      const errorMessage = error.response && error.response.data && error.response.data.msg ? error.response.data.msg : 'An error occurred. Please try again.';
      alert(errorMessage);
    }
  };

  return (
    <Container className="new-password-container">
      <Box className="new-password-content">
        <Box className="new-password-box">
          <Typography variant="h4" className="new-password-title">Set New Password</Typography>
          <form onSubmit={handleSubmit} className="new-password-form">
            <TextField 
              label="New Password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              fullWidth 
              className="new-password-input"
            />
            <Button type="submit" variant="contained" color="primary" fullWidth className="new-password-button">Reset Password</Button>
          </form>
        </Box>
      </Box>
    </Container>
  );
};

export default NewPassword;