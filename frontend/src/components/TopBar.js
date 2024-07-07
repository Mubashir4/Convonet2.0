import React from 'react';
import { AppBar, Toolbar, IconButton } from '@mui/material';
import { Link } from 'react-router-dom';
import './styles/TopBar.css';
import favicon from '../assets/favicon.ico'; // Adjust the path based on your folder structure

const TopBar = () => {
  return (
    <AppBar position="static" className="topbar">
      <Toolbar>
        <Link to="/" className="logo-link">
          <IconButton edge="start" className="menuButton" color="inherit" aria-label="menu">
            <img src={favicon} alt="logo" className="logo" />
          </IconButton>
        </Link>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
