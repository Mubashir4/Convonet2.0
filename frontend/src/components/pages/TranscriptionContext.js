// TranscriptionContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { encryptData, decryptData } from '../utils/encryption'; // Assuming encryption utilities are in this path

const TranscriptionContext = createContext();

export const TranscriptionProvider = ({ children }) => {
  const [transcription, setTranscription] = useState('');
  const [transcriptionHistory, setTranscriptionHistory] = useState('');

  useEffect(() => {
    const savedTranscription = sessionStorage.getItem('transcription');
    const savedTranscriptionHistory = sessionStorage.getItem('transcriptionHistory');

    if (savedTranscription) {
      setTranscription(decryptData(savedTranscription));
    }

    if (savedTranscriptionHistory) {
      setTranscriptionHistory(decryptData(savedTranscriptionHistory));
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('transcription', encryptData(transcription));
  }, [transcription]);

  useEffect(() => {
    sessionStorage.setItem('transcriptionHistory', encryptData(transcriptionHistory));
  }, [transcriptionHistory]);

  return (
    <TranscriptionContext.Provider value={{ transcription, setTranscription, transcriptionHistory, setTranscriptionHistory }}>
      {children}
    </TranscriptionContext.Provider>
  );
};

export const useTranscription = () => useContext(TranscriptionContext);
