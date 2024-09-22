import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Card,
  CardContent,
  CardActions,
  Button,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { decryptData } from '../utils/encryption';
import '../styles/TranscriptionHistoryPage.css';
import CONFIG from '../../.config';
import ReactMarkdown from 'react-markdown';

const TranscriptionHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [copyMessage, setCopyMessage] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      const encryptedUser = sessionStorage.getItem('user');
      const user = encryptedUser ? decryptData(encryptedUser) : null;
      const email = user ? user.email : '';
      if (!email) {
        console.error('User email is not available');
        return;
      }

      try {
        const response = await axios.get(`${CONFIG.SERVER_IP}/api/getTranscriptionHistory`, {
          params: { email },
        });
        setHistory(response.data.reverse()); // Show latest at the top
      } catch (error) {
        console.error('Error fetching transcription history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopyMessage(true);
    setTimeout(() => setCopyMessage(false), 2000); // Show message for 2 seconds
  };

  const handleToggleExpand = (index) => {
    setExpanded((prevState) => ({
      ...prevState,
      [index]: !prevState[index],
    }));
  };

  return (
    <Box className="history-container">
      <Typography variant="h3" className="history-title">
        <b>History</b>
      </Typography>
      {copyMessage && <Box className="copied-message show">Copied to clipboard</Box>}
      <Box className="history-list">
        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          history.map((entry, index) => (
            <Card key={index} className="history-item">
              <CardContent>
                <Typography variant="body2" className="timestamp">
                  {entry.createdAt && new Date(entry.createdAt).toLocaleString()}
                </Typography>

                {/* Response Section */}
                <Box className="response-box">
                  <Box className="section-header">
                    <Typography variant="h6" className="section-title">
                      Response
                    </Typography>
                    <IconButton
                      onClick={() => handleCopyToClipboard(entry.diagnosisText)}
                      className="copy-button"
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Box>
                  <Collapse in={expanded[index]} collapsedSize={100}>
                    <Typography variant="body1" className="response-text">
                      <ReactMarkdown>{entry.diagnosisText}</ReactMarkdown>
                    </Typography>
                  </Collapse>
                  <CardActions className="expand-actions">
                    <Button
                      size="small"
                      onClick={() => handleToggleExpand(index)}
                      endIcon={
                        <ExpandMoreIcon
                          className={`expand-icon ${expanded[index] ? 'expanded' : ''}`}
                        />
                      }
                    >
                      {expanded[index] ? 'Show Less' : 'Show More'}
                    </Button>
                  </CardActions>
                </Box>

                {/* Transcription Section */}
                <Box className="transcription-box">
                  <Box className="section-header">
                    <Typography variant="h6" className="section-title">
                      Query
                    </Typography>
                    <IconButton
                      onClick={() => handleCopyToClipboard(entry.transcription)}
                      className="copy-button"
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Box>
                  <Collapse in={expanded[index]} collapsedSize={80}>
                    <Typography variant="body2" className="transcription-text">
                      <ReactMarkdown>{entry.transcription}</ReactMarkdown>
                    </Typography>
                  </Collapse>
                  <CardActions className="expand-actions">
                    <Button
                      size="small"
                      onClick={() => handleToggleExpand(index)}
                      endIcon={
                        <ExpandMoreIcon
                          className={`expand-icon ${expanded[index] ? 'expanded' : ''}`}
                        />
                      }
                    >
                      {expanded[index] ? 'Show Less' : 'Show More'}
                    </Button>
                  </CardActions>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
};

export default TranscriptionHistoryPage;