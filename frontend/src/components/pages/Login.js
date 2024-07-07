import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';
import '../styles/Login.css';
import { encryptData } from '../utils/encryption';
import CONFIG from '../../.config';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${CONFIG.SERVER_IP}/api/login`, { email, password });
      sessionStorage.setItem('token', res.data.token);
      sessionStorage.setItem('user', encryptData(res.data.user)); // Encrypt and store user data
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error.response && error.response.data && error.response.data.msg ? error.response.data.msg : 'An error occurred. Please try again.';
      alert(errorMessage);
    }
  };

  return (
    <Container className="login-container">
      <Box className="login-content">
        <Box className="login-box">
          <Typography variant="h4" className="login-title">Login</Typography>
          <form onSubmit={handleSubmit} className="login-form">
            <TextField 
              label="Email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              fullWidth 
              className="login-input"
            />
            <TextField 
              label="Password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              fullWidth 
              className="login-input"
            />
            <Button type="submit" variant="contained" color="primary" fullWidth className="login-button">Login</Button>
          </form>
          <Link to="/signup" className="signup-link">Create a new account</Link>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
