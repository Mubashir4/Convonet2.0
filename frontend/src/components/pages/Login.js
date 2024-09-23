// Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import axios from 'axios';
import '../styles/Login.css';
import { encryptData } from '../utils/encryption';
import CONFIG from '../../.config';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // For toggling password visibility
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${CONFIG.SERVER_IP}/api/login`, { email, password });
      sessionStorage.setItem('token', res.data.token);
      sessionStorage.setItem('user', encryptData(res.data.user)); // Encrypt and store user data
      navigate('/dashboard');
    } catch (error) {
      const errorMessage =
        error.response && error.response.data && error.response.data.msg
          ? error.response.data.msg
          : 'An error occurred. Please try again.';
      alert(errorMessage);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container className="login-container" maxWidth={false}>
      <Box className="login-content">
        <Paper elevation={6} className="login-box">
          <Typography variant="h4" className="login-title">
            Convonote
          </Typography>
          <form onSubmit={handleSubmit} className="login-form">
            <TextField
              label="Email"
              type="email"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              className="login-input"
              autoComplete="email"
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              className="login-input"
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleClickShowPassword} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              className="login-button"
            >
              Login
            </Button>
          </form>
          <Link to="/reset-password" className="forgot-password-link">
            Forgot Password?
          </Link>
          <Typography variant="body2" className="signup-text">
            Don't have an account?{' '}
            <Link to="/signup" className="signup-link">
              Sign Up
            </Link>
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;