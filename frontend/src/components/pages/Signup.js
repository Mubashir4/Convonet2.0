import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';
import ReCAPTCHA from 'react-google-recaptcha';
import '../styles/Signup.css';
import CONFIG from '../../.config';

const Signup = () => {
  const [role, setRole] = useState('doctor');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recaptchaToken) {
      alert('Please verify that you are not a robot.');
      return;
    }
    try {
      const res = await axios.post(`${CONFIG.SERVER_IP}/api/signup`, { ...formData, role, recaptchaToken });
      alert(res.data.msg);
      navigate('/');
    } catch (error) {
      alert(error.response.data.msg);
    }
  };

  return (
    <Container className="signup-container">
      <Box className="signup-box">
        <Typography variant="h4" className="signup-title">Sign Up</Typography>
        <form onSubmit={handleSubmit} className="signup-form">
          <TextField 
            label="Name" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
            fullWidth 
            className="signup-input"
          />
          <TextField 
            label="Email" 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleChange} 
            required 
            fullWidth 
            className="signup-input"
          />
          <TextField 
            label="Password" 
            type="password" 
            name="password" 
            value={formData.password} 
            onChange={handleChange} 
            required 
            fullWidth 
            className="signup-input"
          />
          <ReCAPTCHA
            sitekey="6Lf2tAIqAAAAABsuWWPRKLqty-Zv2nHjlZRxTSmq"
            onChange={handleRecaptchaChange}
          />
          <Button type="submit" variant="contained" color="primary" fullWidth className="signup-button">Sign Up</Button>
        </form>
        <Link to="/" className="login-link">Already have an account? Login</Link>
      </Box>
    </Container>
  );
};

export default Signup;
