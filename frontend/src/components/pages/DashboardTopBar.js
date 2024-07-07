import React from 'react';
import { AppBar, Toolbar, IconButton, Button } from '@mui/material';
import '../styles/DashboardTopBar.css';
import favicon from '../../assets/favicon.ico';

const DashboardTopBar = ({ onLogout }) => {
  return (
    <AppBar position="static" className="dashboard-topbar">
      <Toolbar>
        <IconButton edge="start" color="inherit" aria-label="menu">
          <img src={favicon} alt="logo" className="dashboard-logo" />
        </IconButton>
        <Button color="inherit" onClick={onLogout} style={{ marginLeft: 'auto' }}>Logout</Button>
      </Toolbar>
    </AppBar>
  );
};

export default DashboardTopBar;
