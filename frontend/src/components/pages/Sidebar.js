import React, { useState, useEffect } from 'react';
import { List, ListItem, ListItemText, Divider, Box, Typography, IconButton, Drawer, Button } from '@mui/material';
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
  const userOptions = ['History','Transcribe']; // Removed 'Make Notes' from here

  useEffect(() => {
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer) {
      if (isOpen) {
        dashboardContainer.classList.add('expanded');
        dashboardContainer.classList.remove('collapsed');
      } else {
        dashboardContainer.classList.remove('expanded');
        dashboardContainer.classList.add('collapsed');
      }
    }
  }, [isOpen]);

  return (
    <Drawer
      variant="persistent"
      open={isOpen}
      onClose={toggleSidebar}
      anchor="left"
      sx={{
        '& .MuiDrawer-paper': {
          backgroundColor: '#171717',
          width: '250px',
          transition: 'width 0.3s ease-in-out',
          overflowX: 'hidden',
        }
      }}
    >
      <Box className="sidebar-content" sx={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Box>
          <IconButton onClick={toggleSidebar} className="menu-button" sx={{ color: 'white', display: 'block', margin: '0 auto' }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ textAlign: 'center', color: 'white', animation: 'fadeIn 1s ease-in-out' }}>
            {doctorName}
          </Typography>
          <List component="nav" className="animated-menu">
            {adminOptions.concat(userOptions).map((text) => (
              <ListItem
                key={text}
                onClick={() => handleOptionClick(text)}
                sx={{
                  marginBottom: 1,
                  padding: '4px 16px',
                  transition: 'transform 0.3s ease, color 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    color: '#e40a1c',
                  }
                }}
              >
                <ListItemText primary={text} sx={{ color: 'white' }} />
              </ListItem>
            ))}
          </List>
          {/* 'Make Notes' Button with Updated Positioning and Size */}
        <Button
          onClick={() => handleOptionClick('Make Notes')}
          className="make-notes-button"
          sx={{
            width: '150px', // Smaller width
            height: '150px', // Smaller height
            backgroundColor: '#e40a1c',
            color: '#dcd3d4',
            borderRadius: '50%',
            margin: '10px auto', // Closer to Logout
            fontWeight: 'bold', // Bold text
            fontSize: '1.1rem', // Slightly larger font
            display: 'block',
            '&:hover': {
              backgroundColor: '#f5c6cb',
              transform: 'scale(1.1)', // Animation effect on hover
              transition: 'transform 0.2s ease-in-out',
            },
          }}
        >
          Make Notes
        </Button>
          <Divider sx={{ backgroundColor: 'white', animation: 'fadeIn 1.5s ease-in-out' }} />
          <ListItem onClick={onLogout}>
            <ListItemText primary="Logout" sx={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }} />
          </ListItem>
          <Divider sx={{ backgroundColor: 'white', animation: 'fadeIn 1.5s ease-in-out' }} />
        </Box>

        
      </Box>
    </Drawer>
  );
};

export default Sidebar;
