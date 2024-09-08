import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Box, IconButton, CircularProgress } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './Sidebar';
import ContextDocument from './ContextDocument';
import Transcribe from './Transcribe';
import Diagnosis from './Diagnosis';
import AdminPanel from './AdminPanel';
import TranscriptionHistory from './TranscriptionHistoryPage';
import { decryptData } from '../utils/encryption';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [doctorName, setDoctorName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [navigateTo, setNavigateTo] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const encryptedUser = sessionStorage.getItem('user');
    const user = encryptedUser ? decryptData(encryptedUser) : null;
    if (!user) {
      navigate('/');
    } else {
      setDoctorName(user.name);
      setUserRole(user.role);
      if (user.role === 'admin') {
        setSelectedOption('Admin Panel');
      } else {
        setSelectedOption('Transcribe');
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (!isLoading && navigateTo) {
      setSelectedOption(navigateTo);
      setNavigateTo(null);
    }
  }, [isLoading, navigateTo]);

  useEffect(() => {
  const dashboardContainer = document.querySelector('.dashboard-container');
  if (dashboardContainer) {
    if (isSidebarOpen) {
      dashboardContainer.classList.add('expanded');
      dashboardContainer.classList.remove('collapsed');
    } else {
      dashboardContainer.classList.remove('expanded');
      dashboardContainer.classList.add('collapsed');
    }
  }
}, [isSidebarOpen]);


  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/');
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const renderContent = () => {
    switch (selectedOption) {
      case 'Admin Panel':
        return <AdminPanel />;
      case 'Transcribe':
        return (
          <Transcribe
            setIsLoading={setIsLoading}
            setNavigateTo={setNavigateTo}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            mediaRecorderRef={mediaRecorderRef}
          />
        );
      case 'Make Notes':
        return <Diagnosis />;
      case 'History':
        return <TranscriptionHistory />;
      default:
        return <Typography variant="h5">Select an option from the sidebar.</Typography>;
    }
  };

  return (
    <Box className="dashboard-container" sx={{ display: 'flex', height: '100vh' }}>
        {!isSidebarOpen && (
          <IconButton
          onClick={toggleSidebar}
          sx={{
            color: 'grey',
            backgroundColor: '#1a1919',
            borderRadius: '4px',
            marginRight: '10px',
            color:'white'
          }}
        >
          <MenuIcon />
        </IconButton>
        )}

  
      {/* Sidebar Component */}
      <Sidebar
        doctorName={doctorName}
        onOptionSelect={handleOptionSelect}
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        isAdmin={userRole === 'admin'}
        onLogout={handleLogout}
        isRecording={isRecording}
        stopRecording={stopRecording}
        setNavigateTo={setNavigateTo}
      />
  
      {/* Main Content Area */}
      <Box
        sx={{
          flexGrow: 1,
          padding: '20px',
          transition: 'margin-left 0.3s ease-in-out',
          marginLeft: isSidebarOpen ? '250px' : '0',
          backgroundColor: '#171717'
        }}
      >
        {isLoading ? (
          <Box
            className="loading-spinner"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}
          >
            <CircularProgress />
            <Typography variant="h6" sx={{ marginTop: '10px' }}>
              Please wait...
            </Typography>
          </Box>
        ) : (
          renderContent()
        )}
      </Box>
    </Box>
  );
  
};

export default Dashboard;
