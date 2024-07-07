import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';
import '../styles/ForgotPassword.css';
import CONFIG from '../../.config';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${CONFIG.SERVER_IP}/api/forgot-password`, { email });
      alert(res.data.msg);
    } catch (error) {
      const errorMessage = error.response && error.response.data && error.response.data.msg ? error.response.data.msg : 'An error occurred. Please try again.';
      alert(errorMessage);
    }
  };

  return (
    <Container className="forgot-password-container">
      <Box className="forgot-password-box">
        <Typography variant="h4" className="forgot-password-title">Forgot Password</Typography>
        <form onSubmit={handleSubmit} className="forgot-password-form">
          <TextField 
            label="Email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            fullWidth 
            className="forgot-password-input"
          />
          <Button type="submit" variant="contained" color="primary" fullWidth className="forgot-password-button">Send Reset Link</Button>
        </form>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
