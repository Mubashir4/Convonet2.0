import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';
import '../styles/ResetPassword.css';
import CONFIG from '../../.config';

const ResetPassword = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${CONFIG.SERVER_IP}/api/reset-password`, { email });
      alert('A password reset link has been sent to your email.');
    } catch (error) {
      const errorMessage = error.response && error.response.data && error.response.data.msg ? error.response.data.msg : 'An error occurred. Please try again.';
      alert(errorMessage);
    }
  };

  return (
    <Container className="reset-password-container">
      <Box className="reset-password-content">
        <Box className="reset-password-box">
          <Typography variant="h4" className="reset-password-title">Reset Password</Typography>
          <form onSubmit={handleSubmit} className="reset-password-form">
            <TextField 
              label="Email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              fullWidth 
              className="reset-password-input"
            />
            <Button type="submit" variant="contained" color="primary" fullWidth className="reset-password-button">Send Reset Link</Button>
          </form>
        </Box>
      </Box>
    </Container>
  );
};

export default ResetPassword;