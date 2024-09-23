// scanImages.js

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';
import Tesseract from 'tesseract.js';
import CONFIG from '../../.config'; // Adjusted import path

// Use the server IP from the configuration
const SERVER_IP = CONFIG.SERVER_IP;

function ScanImage() {
  const [textData, setTextData] = useState('');
  const [imageProcessing, setImageProcessing] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  useEffect(() => {
    const newSocket = io(SERVER_IP, { query: { sessionId } });

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection Error:', err.message);
    });

    // Listen for image data from the mobile device
    newSocket.on('imageData', (data) => {
      console.log('Received image data');
      setImageProcessing(true);
      processImage(data);
    });

    return () => {
      newSocket.close();
    };

    // Function to process the image using Tesseract.js
    function processImage(imageData) {
      Tesseract.recognize(
        imageData,
        'eng',
        { logger: m => console.log(m) }
      ).then(({ data: { text } }) => {
        setTextData((prev) => prev + (prev ? '\n' : '') + text.trim());
        setImageProcessing(false);
      }).catch(err => {
        console.error('Error during OCR:', err);
        alert('Error during OCR processing. Please try again.');
        setImageProcessing(false);
      });
    }
  }, [sessionId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(textData);
    alert('Text copied to clipboard!');
  };

  const handleClear = () => {
    setTextData('');
  };

  return (
    <div className="ScanImage">
      <h1>Scan QR Code with Mobile Device</h1>
      <QRCodeSVG value={`${SERVER_IP}/mobile.html?sessionId=${sessionId}`} size={256} />
      <div className="textarea-container">
        <textarea value={textData} readOnly rows={10} cols={50} />
        {imageProcessing && <p>Processing image...</p>}
        <div className="buttons">
          <button onClick={handleCopy}>Copy</button>
          <button onClick={handleClear}>Clear</button>
        </div>
      </div>
    </div>
  );
}

export default ScanImage;