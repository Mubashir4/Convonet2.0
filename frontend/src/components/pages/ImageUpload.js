import React, { useState } from 'react';
import { Button } from '@mui/material';
import Tesseract from 'tesseract.js';
import CONFIG from '../../.config'; // Import the configuration

const ImageUpload = ({ onTextExtracted }) => {
  const [loading, setLoading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('image', file);

      setLoading(true);

      try {
        const response = await fetch(`${CONFIG.SERVER_IP}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const reader = new FileReader();
          reader.onload = () => {
            extractText(reader.result);
          };
          reader.readAsDataURL(file);
        } else {
          console.error('Failed to upload image');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
  };

  const extractText = (imageData) => {
    Tesseract.recognize(
      imageData,
      'eng',
      {
        logger: (m) => console.log(m),
      }
    )
    .then(({ data: { text } }) => {
      setLoading(false);
      onTextExtracted(text);
    })
    .catch((err) => {
      setLoading(false);
      console.error(err);
    });
  };

  return (
    <div>
      <Button variant="contained" component="label">
        Upload Image
        <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
      </Button>
      {loading && <p>Extracting text...</p>}
    </div>
  );
};

export default ImageUpload;
