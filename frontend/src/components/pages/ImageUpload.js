import React from 'react';
import Tesseract from 'tesseract.js';

const ImageUpload = ({ onTextExtracted }) => {
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        Tesseract.recognize(
          reader.result,
          'eng',
          {
            logger: (m) => console.log(m),
          }
        ).then(({ data: { text } }) => {
          onTextExtracted(text);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
};

export default ImageUpload;
