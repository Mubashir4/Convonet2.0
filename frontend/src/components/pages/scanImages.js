// frontend/src/components/pages/scanImages.js

import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react'; // Use named export QRCodeCanvas
import io from 'socket.io-client';
import Tesseract from 'tesseract.js';
import CONFIG from '../../.config'; // Adjust the import path if necessary

// Use the server URL from the configuration
const SERVER_URL = CONFIG.SERVER_IP; // Ensure it uses HTTPS

function ScanImage() {
  const [textData, setTextData] = useState('');
  const [imageProcessing, setImageProcessing] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  useEffect(() => {
    // Initialize Socket.IO client
    const socket = io(SERVER_URL, { query: { sessionId } });

    socket.on('connect', () => {
      console.log('🔗 Connected to server via WebSocket');
    });

    socket.on('connect_error', (err) => {
      console.error('❌ WebSocket Connection Error:', err.message);
    });

    // Listen for image data from the mobile device
    socket.on('imageData', (data) => {
      console.log('📥 Received image data from mobile client');
      console.log(`📦 Image data size: ${data.length} characters`);
      setImageProcessing(true);
      processImage(data, socket);
    });

    // Clean up the socket connection on component unmount
    return () => {
      socket.disconnect();
      console.log('🔌 Disconnected from server');
    };
  }, [sessionId]);

  // Function to process the image using Tesseract.js
  const processImage = async (imageData, socket) => {
    try {
      console.log('🖼️ Starting OCR processing...');
      const { data: { text } } = await Tesseract.recognize(
        imageData,
        'eng',
        { logger: m => console.log(`Tesseract.js: ${m.status} (${Math.round(m.progress * 100)}%)`) }
      );
      console.log('✅ OCR processing completed.');
      setTextData(prev => prev + (prev ? '\n' : '') + text.trim());

      // Optionally, you can send the extracted text back to the mobile device
      // socket.emit('textData', text.trim());
    } catch (error) {
      console.error('❌ Error during OCR processing:', error);
      alert('Error during OCR processing. Please try again.');
    } finally {
      setImageProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(textData)
      .then(() => {
        alert('✅ Text copied to clipboard!');
      })
      .catch(err => {
        console.error('❌ Error copying text:', err);
        alert('Failed to copy text.');
      });
  };

  const handleClear = () => {
    setTextData('');
  };

  return (
    <div className="ScanImage" style={styles.container}>
      <h1 style={styles.header}>Scan QR Code with Mobile Device</h1>
      <div style={styles.qrCodeContainer}>
        <QRCodeCanvas
          value={`${SERVER_URL}/mobile.html?sessionId=${sessionId}`}
          size={256}
          bgColor="#ffffff"
          fgColor="#000000"
          level="Q"
          style={styles.qrCode}
        />
      </div>
      <div className="textarea-container" style={styles.textareaContainer}>
        <textarea
          value={textData}
          readOnly
          rows={10}
          cols={50}
          style={styles.textarea}
          placeholder="Extracted text will appear here..."
        />
        {imageProcessing && <p style={styles.processingText}>🔄 Processing image...</p>}
        <div className="buttons" style={styles.buttonsContainer}>
          <button onClick={handleCopy} style={styles.button}>📋 Copy</button>
          <button onClick={handleClear} style={styles.button}>🧹 Clear</button>
        </div>
      </div>
    </div>
  );
}

// Inline styles for better user interface
const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    padding: '40px',
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center',
  },
  header: {
    fontSize: '32px',
    marginBottom: '40px',
    color: '#333',
  },
  qrCodeContainer: {
    marginBottom: '40px',
    display: 'flex',
    justifyContent: 'center',
  },
  qrCode: {
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  },
  textareaContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  textarea: {
    width: '100%',
    maxWidth: '600px',
    height: '200px',
    padding: '10px',
    fontSize: '16px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    resize: 'vertical',
  },
  processingText: {
    marginTop: '10px',
    fontStyle: 'italic',
    color: '#007bff',
  },
  buttonsContainer: {
    marginTop: '20px',
    display: 'flex',
    gap: '20px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '18px',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#007bff',
    color: '#fff',
    transition: 'background-color 0.3s',
  },
};

// Export the component
export default ScanImage;