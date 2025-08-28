import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Snackbar,
  Alert,
  Typography,
  CircularProgress,
  Backdrop,
  IconButton,
  Grid,
  Tooltip,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Fade,
  Zoom,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Psychology as PsychologyIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { decryptData, encryptData } from '../utils/encryption';
import '../styles/EnhancedDiagnosis.css';
import CONFIG from '../../.config';
import { useTranscription } from './TranscriptionContext';
import ReactMarkdown from 'react-markdown';
import io from 'socket.io-client';

const EnhancedDiagnosis = () => {
  const {
    transcription,
    setTranscription,
    transcriptionHistory,
    setTranscriptionHistory,
  } = useTranscription();
  
  // State management
  const [diagnosis, setDiagnosis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [backdropOpen, setBackdropOpen] = useState(false);
  
  // Real-time workflow state
  const [workflowState, setWorkflowState] = useState({
    isActive: false,
    currentPhase: 0,
    totalPhases: 0,
    currentAgent: '',
    progress: 0,
    plan: null,
    agentStates: new Map(),
    thoughts: [],
    actions: [],
    observations: [],
  });
  
  const [expandedAgents, setExpandedAgents] = useState(new Set());
  const [socket, setSocket] = useState(null);
  const sessionIdRef = useRef(`session_${Date.now()}`);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(CONFIG.SERVER_IP, {
      query: { sessionId: sessionIdRef.current }
    });
    
    setSocket(newSocket);
    
    // Set up event listeners
    newSocket.on('workflowStarted', handleWorkflowStarted);
    newSocket.on('planCreated', handlePlanCreated);
    newSocket.on('phaseStarted', handlePhaseStarted);
    newSocket.on('agentStarted', handleAgentStarted);
    newSocket.on('agentThought', handleAgentThought);
    newSocket.on('agentAction', handleAgentAction);
    newSocket.on('agentObservation', handleAgentObservation);
    newSocket.on('agentCompleted', handleAgentCompleted);
    newSocket.on('phaseCompleted', handlePhaseCompleted);
    newSocket.on('workflowCompleted', handleWorkflowCompleted);
    newSocket.on('agentError', handleAgentError);
    newSocket.on('workflowError', handleWorkflowError);
    
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Event handlers for real-time updates
  const handleWorkflowStarted = (data) => {
    setWorkflowState(prev => ({
      ...prev,
      isActive: true,
      progress: 0,
      agentStates: new Map(),
      thoughts: [],
      actions: [],
      observations: [],
    }));
    setLoading(true);
    setBackdropOpen(true);
  };

  const handlePlanCreated = (data) => {
    setWorkflowState(prev => ({
      ...prev,
      plan: data.plan,
      totalPhases: data.totalPhases,
    }));
  };

  const handlePhaseStarted = (data) => {
    setWorkflowState(prev => ({
      ...prev,
      currentPhase: data.phase,
      progress: (data.phase / prev.totalPhases) * 100,
    }));
  };

  const handleAgentStarted = (data) => {
    setWorkflowState(prev => {
      const newAgentStates = new Map(prev.agentStates);
      newAgentStates.set(data.agentName, {
        status: 'running',
        phase: data.phase,
        thoughts: [],
        actions: [],
        observations: [],
        result: null,
        error: null,
      });
      return {
        ...prev,
        currentAgent: data.agentName,
        agentStates: newAgentStates,
      };
    });
  };

  const handleAgentThought = (data) => {
    setWorkflowState(prev => {
      const newAgentStates = new Map(prev.agentStates);
      const agentState = newAgentStates.get(data.agentName) || {};
      agentState.thoughts = [...(agentState.thoughts || []), data.thought];
      newAgentStates.set(data.agentName, agentState);
      return { ...prev, agentStates: newAgentStates };
    });
  };

  const handleAgentAction = (data) => {
    setWorkflowState(prev => {
      const newAgentStates = new Map(prev.agentStates);
      const agentState = newAgentStates.get(data.agentName) || {};
      agentState.actions = [...(agentState.actions || []), data.action];
      newAgentStates.set(data.agentName, agentState);
      return { ...prev, agentStates: newAgentStates };
    });
  };

  const handleAgentObservation = (data) => {
    setWorkflowState(prev => {
      const newAgentStates = new Map(prev.agentStates);
      const agentState = newAgentStates.get(data.agentName) || {};
      agentState.observations = [...(agentState.observations || []), data.observation];
      newAgentStates.set(data.agentName, agentState);
      return { ...prev, agentStates: newAgentStates };
    });
  };

  const handleAgentCompleted = (data) => {
    setWorkflowState(prev => {
      const newAgentStates = new Map(prev.agentStates);
      const agentState = newAgentStates.get(data.agentName) || {};
      agentState.status = 'completed';
      agentState.result = data.result;
      newAgentStates.set(data.agentName, agentState);
      return { ...prev, agentStates: newAgentStates };
    });
  };

  const handlePhaseCompleted = (data) => {
    // Phase completion handled by individual agent completions
  };

  const handleWorkflowCompleted = (data) => {
    setWorkflowState(prev => ({
      ...prev,
      isActive: false,
      progress: 100,
    }));
    
    // Extract results from agent states
    const results = data.responses || [];
    setDiagnosis(results);
    setLoading(false);
    setBackdropOpen(false);
    
    setSnackbarMessage('Agent workflow completed successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleAgentError = (data) => {
    setWorkflowState(prev => {
      const newAgentStates = new Map(prev.agentStates);
      const agentState = newAgentStates.get(data.agentName) || {};
      agentState.status = 'error';
      agentState.error = data.error;
      newAgentStates.set(data.agentName, agentState);
      return { ...prev, agentStates: newAgentStates };
    });
  };

  const handleWorkflowError = (data) => {
    setWorkflowState(prev => ({
      ...prev,
      isActive: false,
    }));
    setLoading(false);
    setBackdropOpen(false);
    setSnackbarMessage(`Workflow error: ${data.error}`);
    setSnackbarSeverity('error');
    setSnackbarOpen(true);
  };

  // Initialize component
  useEffect(() => {
    sessionStorage.setItem('userContext', encryptData(''));
    const savedTranscription = sessionStorage.getItem('transcription');
    if (savedTranscription) {
      const decryptedTranscription = decryptData(savedTranscription);
      if (decryptedTranscription) {
        generateDiagnosis(decryptedTranscription);
      }
    }

    return () => {
      sessionStorage.setItem('userContext', encryptData(''));
    };
  }, []);

  const generateDiagnosis = async (text) => {
    const encryptedUser = sessionStorage.getItem('user');
    const user = encryptedUser ? decryptData(encryptedUser) : null;
    const email = user ? user.email : '';
    
    if (!email) {
      setSnackbarMessage('User email is not available');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const encryptedUserContext = sessionStorage.getItem('userContext');
    const userContext = encryptedUserContext ? decryptData(encryptedUserContext) : '';
    
    try {
      const response = await axios.post(`${CONFIG.SERVER_IP}/api/diagnose`, {
        email,
        userContext,
        transcription: text,
        sessionId: sessionIdRef.current,
      });

      // Results will be handled by socket events
      if (!socket) {
        // Fallback if socket is not available
        const encryptedResponses = response.data.responses.map((resp) =>
          encryptData(resp)
        );
        sessionStorage.setItem('diagnosisResults', JSON.stringify(encryptedResponses));
        setDiagnosis(response.data.responses);
      }
      
    } catch (error) {
      console.error('Error generating diagnosis:', error);
      setSnackbarMessage('Error generating diagnosis');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setLoading(false);
      setBackdropOpen(false);
    }
  };

  const toggleAgentExpansion = (agentName) => {
    setExpandedAgents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agentName)) {
        newSet.delete(agentName);
      } else {
        newSet.add(agentName);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbarMessage('Copied to clipboard!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const renderAgentCard = (agentName, agentState) => {
    const isExpanded = expandedAgents.has(agentName);
    const statusColor = agentState.status === 'completed' ? 'success' : 
                       agentState.status === 'error' ? 'error' : 'primary';
    const statusIcon = agentState.status === 'completed' ? <CheckCircleIcon /> :
                      agentState.status === 'error' ? <ErrorIcon /> : <PlayArrowIcon />;

    return (
      <Card key={agentName} sx={{ mb: 2, border: `2px solid ${statusColor === 'success' ? '#4caf50' : statusColor === 'error' ? '#f44336' : '#2196f3'}` }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              {statusIcon}
              <Typography variant="h6" sx={{ ml: 1 }}>
                {agentName}
              </Typography>
              <Chip 
                label={agentState.status || 'pending'} 
                color={statusColor}
                size="small"
                sx={{ ml: 2 }}
              />
            </Box>
            <IconButton onClick={() => toggleAgentExpansion(agentName)}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          
          <Collapse in={isExpanded}>
            <Box sx={{ mt: 2 }}>
              {agentState.thoughts && agentState.thoughts.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary">
                    <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Reasoning Process:
                  </Typography>
                  <List dense>
                    {agentState.thoughts.map((thought, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon>
                          <PsychologyIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={thought} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {agentState.actions && agentState.actions.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="secondary">
                    <PlayArrowIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Actions Taken:
                  </Typography>
                  <List dense>
                    {agentState.actions.map((action, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon>
                          <PlayArrowIcon color="secondary" />
                        </ListItemIcon>
                        <ListItemText primary={action} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {agentState.observations && agentState.observations.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="info">
                    <VisibilityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Observations:
                  </Typography>
                  <List dense>
                    {agentState.observations.map((observation, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon>
                          <VisibilityIcon color="info" />
                        </ListItemIcon>
                        <ListItemText primary={observation} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {agentState.result && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Final Result:
                  </Typography>
                  <ReactMarkdown>{agentState.result}</ReactMarkdown>
                  <IconButton 
                    onClick={() => copyToClipboard(agentState.result)}
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </Box>
              )}
              
              {agentState.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {agentState.error}
                </Alert>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ padding: '20px', backgroundColor: '#000000', color: 'white', minHeight: '100vh' }}>
      <Typography variant="h4" align="center" gutterBottom color="white">
        AI Agent Diagnosis
      </Typography>

      {/* Workflow Progress */}
      {workflowState.isActive && (
        <Fade in={workflowState.isActive}>
          <Card sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="white">
                Agent Workflow Progress
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={workflowState.progress} 
                sx={{ mb: 2, height: 8, borderRadius: 4 }}
              />
              <Typography variant="body2" color="white">
                Phase {workflowState.currentPhase} of {workflowState.totalPhases}
                {workflowState.currentAgent && ` - Current Agent: ${workflowState.currentAgent}`}
              </Typography>
            </CardContent>
          </Card>
        </Fade>
      )}

      {/* Agent States */}
      {workflowState.agentStates.size > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom color="white">
            Agent Execution Details
          </Typography>
          {Array.from(workflowState.agentStates.entries()).map(([agentName, agentState]) =>
            renderAgentCard(agentName, agentState)
          )}
        </Box>
      )}

      {/* Final Results */}
      {diagnosis.length > 0 && !workflowState.isActive && (
        <Zoom in={!workflowState.isActive}>
          <Box>
            <Typography variant="h5" gutterBottom color="white">
              Final Diagnosis Results
            </Typography>
            <Grid container spacing={2}>
              {diagnosis.map((result, index) => (
                <Grid item xs={12} key={index}>
                  <Card sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" color="white">
                          Agent Result {index + 1}
                        </Typography>
                        <IconButton 
                          onClick={() => copyToClipboard(result)}
                          sx={{ color: 'white' }}
                        >
                          <ContentCopyIcon />
                        </IconButton>
                      </Box>
                      <Box sx={{ color: 'white' }}>
                        <ReactMarkdown>{result}</ReactMarkdown>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Zoom>
      )}

      {/* Loading Backdrop */}
      <Backdrop open={backdropOpen} sx={{ zIndex: 9999 }}>
        <Box textAlign="center">
          <CircularProgress color="primary" size={60} />
          <Typography variant="h6" sx={{ mt: 2, color: 'white' }}>
            {workflowState.currentAgent ? 
              `Processing with ${workflowState.currentAgent}...` : 
              'Initializing AI agents...'
            }
          </Typography>
          {workflowState.totalPhases > 0 && (
            <Typography variant="body2" sx={{ mt: 1, color: 'white' }}>
              Phase {workflowState.currentPhase} of {workflowState.totalPhases}
            </Typography>
          )}
        </Box>
      </Backdrop>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EnhancedDiagnosis;