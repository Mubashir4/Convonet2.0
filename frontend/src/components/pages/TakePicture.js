import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TakePicture = () => {
  const videoRef = useRef(null);
  const [imageData, setImageData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const startCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    };
    startCamera();
  }, []);

  const takePicture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/png');
    setImageData(data);
    navigate(`/context-document?image=${encodeURIComponent(data)}`);
  };

  return (
    <div>
      <video ref={videoRef} style={{ width: '100%' }}></video>
      <button onClick={takePicture}>Take Picture</button>
      {imageData && <img src={imageData} alt="Captured" />}
    </div>
  );
};

export default TakePicture;
