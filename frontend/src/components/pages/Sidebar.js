import React, { useState, useEffect } from 'react';
import { List, ListItem, ListItemText, Divider, Box, Typography, IconButton, Drawer } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import '../styles/Sidebar.css';

const Sidebar = ({ doctorName, onOptionSelect, isOpen, toggleSidebar, isAdmin, onLogout, isRecording, stopRecording, setNavigateTo }) => {
  const [selectedOption, setSelectedOption] = useState(isAdmin ? 'Admin Panel' : 'My Notes');

  useEffect(() => {
    if (onOptionSelect) {
      onOptionSelect(selectedOption);
    }
  }, [selectedOption, onOptionSelect]);

  useEffect(() => {
    if (isAdmin) {
      setSelectedOption('Admin Panel');
    } else {
      setSelectedOption('Transcribe');
    }
  }, [isAdmin]);

  const handleOptionClick = (option) => {
    if (isRecording) {
      setNavigateTo(option);
      stopRecording();
    } else {
      setSelectedOption(option);
    }
  };

  const adminOptions = isAdmin ? ['Admin Panel'] : [];
  const userOptions = ['Transcribe', 'Make Notes', 'History']; // Add new page here

  useEffect(() => {
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer) {
      if (isOpen) {
        dashboardContainer.classList.add('collapsed');
        dashboardContainer.classList.remove('expanded');
      } else {
        dashboardContainer.classList.remove('collapsed');
        dashboardContainer.classList.add('expanded');
      }
    }
  }, [isOpen]);

  return (
    <Box className={`sidebar-container ${isOpen ? 'open' : 'closed'}`}>
      <Drawer
        variant="persistent"
        open={isOpen}
        onClose={toggleSidebar}
        className={`sidebar ${isOpen ? 'open' : 'closed'}`}
        anchor="left"
        sx={{ '& .MuiDrawer-paper': { backgroundColor: '#1a1919' } }} // Apply custom background color here
      >
        <Box className="sidebar-content">
          <IconButton onClick={toggleSidebar} className="menu-button" sx={{ color: 'white', margin: '0 auto' }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" className="sidebar-doctor-name" sx={{ textAlign: 'center', color: 'white' }}>
            {doctorName}
          </Typography>
          <List component="nav">
            {adminOptions.concat(userOptions).map((text) => (
              <ListItem
                key={text}
                onClick={() => handleOptionClick(text)}
                className={`MuiListItem-root ${text === 'Make Notes' ? 'make-notes' : ''} ${selectedOption === text ? (text === 'Make Notes' ? 'selected-red' : 'selected') : ''}`}
                sx={{ marginBottom: 0, padding: '4px 16px' }} // Minimal space between items
              >
                <ListItemText primary={text} />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ backgroundColor: 'white' }} />
          <ListItem onClick={onLogout} sx={{ marginBottom: 0, padding: '4px 16px' }}>
            <ListItemText primary="Logout" sx={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }} />
          </ListItem>
          <Divider sx={{ backgroundColor: 'white' }} />
        </Box>
      </Drawer>
    </Box>
  );
};

export default Sidebar;
