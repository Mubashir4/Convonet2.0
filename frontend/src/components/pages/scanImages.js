import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import io from 'socket.io-client';
import CONFIG from '../../.config';

// Use the server IP from the configuration
const SERVER_IP = CONFIG.SERVER_IP;

function ScanImage() {
  const [textData, setTextData] = useState('');
  const [socket, setSocket] = useState(null);

  // Generate a unique session ID only once
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  useEffect(() => {
    // Connect to the server with the sessionId
    const newSocket = io(SERVER_IP, { query: { sessionId } });
    setSocket(newSocket);

    // Listen for text data from the mobile device
    newSocket.on('textData', (data) => {
      setTextData((prev) => prev + (prev ? '\n' : '') + data);
    });

    // Clean up the socket connection on unmount
    return () => {
      newSocket.close();
    };
  }, [sessionId]); // sessionId is now constant

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
      <QRCode value={`${SERVER_IP}/mobile.html?sessionId=${sessionId}`} />
      <div className="textarea-container">
        <textarea value={textData} readOnly rows={10} cols={50} />
        <div className="buttons">
          <button onClick={handleCopy}>Copy</button>
          <button onClick={handleClear}>Clear</button>
        </div>
      </div>
    </div>
  );
}

export default ScanImage;