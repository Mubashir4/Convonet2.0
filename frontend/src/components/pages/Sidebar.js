/* Sidebar.js */
import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  Typography,
  IconButton,
  Drawer,
  ListItemIcon,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AdminPanelSettings,
  Mic,
  NoteAdd,
  Scanner,
  History as HistoryIcon,
  Logout,
} from '@mui/icons-material';
import '../styles/Sidebar.css';

const drawerWidth = 250;

const Sidebar = ({
  doctorName,
  onOptionSelect,
  isOpen,
  toggleSidebar,
  isAdmin,
  onLogout,
  isRecording,
  stopRecording,
  setNavigateTo,
}) => {
  const [selectedOption, setSelectedOption] = useState(isAdmin ? 'Admin Panel' : 'Transcribe');

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
  const userOptions = ['Transcribe', 'Make Notes'];
  const bottomOptions = ['Scan Image', 'History'];

  // Map of icons for each menu item
  const iconMap = {
    'Admin Panel': <AdminPanelSettings />,
    Transcribe: <Mic />,
    'Make Notes': <NoteAdd />,
    'Scan Image': <Scanner />,
    History: <HistoryIcon />,
    Logout: <Logout />,
  };

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
          backgroundColor: 'var(--sidebar-bg-color)',
          width: '250px',
          transition: 'width 0.3s ease-in-out',
          overflowX: 'hidden',
        },
      }}
    >
      <Box
        className="sidebar-content"
        sx={{
          width: drawerWidth,
          backgroundColor: 'var(--sidebar-bg-color)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: 'white',
          padding: '20px',
        }}
      >
        {/* Top section */}
        <Box sx={{ flexGrow: 1 }}>
          <IconButton
            onClick={toggleSidebar}
            className="menu-button"
            sx={{ color: 'white', display: 'block', margin: '0 auto' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            sx={{ textAlign: 'center', color: 'white', animation: 'fadeIn 1s ease-in-out', marginTop: 2 }}
          >
            <b>{doctorName}</b>
          </Typography>
          <List component="nav" className="animated-menu">
            {adminOptions.concat(userOptions).map((text) => {
              const isMakeNotes = text === 'Make Notes';
              const icon = iconMap[text];
              return (
                <ListItem
                  button
                  key={text}
                  onClick={() => handleOptionClick(text)}
                  className={isMakeNotes ? 'make-notes-item' : ''}
                  sx={{
                    marginBottom: 1,
                    padding: '4px 16px',
                    backgroundColor: isMakeNotes ? 'var(--make-notes-bg)' : 'transparent',
                    color: 'white',
                    transition: 'transform 0.3s ease, background-color 0.3s ease, color 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      backgroundColor: isMakeNotes ? 'var(--make-notes-hover-bg)' : 'var(--menu-item-hover-bg)',
                      color: 'white',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: '40px' }}>{icon}</ListItemIcon>
                  <ListItemText primary={text} />
                  {isMakeNotes && (
                    <>
                      <div className="sparkle" style={{ top: '10%', left: '20%', animationDelay: '0s' }}></div>
                      <div className="sparkle" style={{ top: '30%', left: '50%', animationDelay: '0.3s' }}></div>
                      <div className="sparkle" style={{ top: '60%', left: '70%', animationDelay: '0.6s' }}></div>
                      <div className="sparkle" style={{ top: '80%', left: '40%', animationDelay: '0.9s' }}></div>
                      <div className="sparkle" style={{ top: '50%', left: '80%', animationDelay: '1.2s' }}></div>
                    </>
                  )}
                </ListItem>
              );
            })}
          </List>
        </Box>
        {/* Bottom section */}
        <Box>
          <List component="nav">
            {bottomOptions.map((text) => (
              <ListItem
                button
                key={text}
                onClick={() => handleOptionClick(text)}
                sx={{
                  padding: '4px 16px',
                  '&:hover': {
                    backgroundColor: 'var(--menu-item-hover-bg)',
                    color: 'white',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: '40px' }}>{iconMap[text]}</ListItemIcon>
                <ListItemText
                  primary={text}
                  sx={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }}
                />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ backgroundColor: 'white', marginY: 1 }} />
          {/* Logout option */}
          <ListItem
            button
            onClick={onLogout}
            sx={{
              padding: '4px 16px',
              backgroundColor: 'var(--logout-bg-color)',
              '&:hover': {
                backgroundColor: 'var(--logout-hover-bg)',
                color: 'white',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: '40px' }}>{iconMap['Logout']}</ListItemIcon>
            <ListItemText
              primary="Logout"
              sx={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }}
            />
          </ListItem>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;