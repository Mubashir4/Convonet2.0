import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Typography, IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { decryptData } from '../utils/encryption';
import '../styles/TranscriptionHistoryPage.css';
import CONFIG from '../../.config';

const TranscriptionHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTranscription, setExpandedTranscription] = useState({});
  const [expandedDiagnosis, setExpandedDiagnosis] = useState({});
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
        setHistory(response.data);
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

  const handleToggleExpandTranscription = (index) => {
    setExpandedTranscription(prevState => ({
      ...prevState,
      [index]: !prevState[index]
    }));
  };

  const handleToggleExpandDiagnosis = (index) => {
    setExpandedDiagnosis(prevState => ({
      ...prevState,
      [index]: !prevState[index]
    }));
  };

  return (
    <Box className="history-container">
      <Typography variant="h4" className="history-title">
        Transcription History
      </Typography>
      {copyMessage && <Box className="copied-message show">Copied to clipboard</Box>}
      <Box className="history-list">
        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          history.map((entry, index) => (
            <Box key={index} className="history-item">
              {entry.createdAt && (
                <Typography variant="body2" className="timestamp">
                  {new Date(entry.createdAt).toLocaleString()}
                </Typography>
              )}
              <Box className="transcription-box">
                <Typography
                  variant="body1"
                  className={expandedTranscription[index] ? '' : 'collapsed'}
                  sx={{ paddingRight: '40px' }} // Add padding to avoid overlap with the copy icon
                >
                  {entry.transcription}
                </Typography>
                <IconButton
                  onClick={() => handleCopyToClipboard(entry.transcription)}
                  sx={{ position: 'absolute', top: 0, right: 5, color: 'white' }}
                >
                  <ContentCopyIcon />
                </IconButton>
                {entry.transcription && (
                  <Typography
                    variant="body2"
                    className="show-more"
                    onClick={() => handleToggleExpandTranscription(index)}
                  >
                    {expandedTranscription[index] ? 'Show Less' : 'Show More'}
                  </Typography>
                )}
              </Box>
              <Box className="response-box">
                <Typography
                  variant="body1"
                  className={expandedDiagnosis[index] ? '' : 'collapsed-description'}
                  sx={{ paddingRight: '40px' }}
                >
                  {entry.diagnosisText}
                </Typography>
                <IconButton
                  onClick={() => handleCopyToClipboard(entry.diagnosisText)}
                  sx={{ position: 'absolute', top: 0, right: 5, color: 'white' }}
                >
                  <ContentCopyIcon />
                </IconButton>
                {entry.diagnosisText && (
                  <Typography
                    variant="body2"
                    className="show-more"
                    onClick={() => handleToggleExpandDiagnosis(index)}
                  >
                    {expandedDiagnosis[index] ? 'Show Less' : 'Show More'}
                  </Typography>
                )}
              </Box>
            </Box>
          )).reverse() // Reverse to show latest at the bottom
        )}
      </Box>
    </Box>
  );
};

export default TranscriptionHistoryPage;
