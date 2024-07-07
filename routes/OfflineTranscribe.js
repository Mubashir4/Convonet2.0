const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const configFilePath = path.join(__dirname, 'config.json');

// Read the config file
const readConfig = () => {
  const rawData = fs.readFileSync(configFilePath);
  return JSON.parse(rawData);
};

// Configure multer to store files in the 'uploads' directory
const upload = multer({ 
  dest: 'uploads/', 
  limits: { fileSize: 100 * 1024 * 1024 } // Increase file size limit to 100MB
});
const SUPPORTED_FORMATS = ['wav', 'mp3', 'm4a', 'flac'];

const transcribeAudioOffline = async (req, res) => {
    const audioFile = req.file;
    const counter = parseInt(req.body.counter, 10); // Get counter value from the request

    // Check if the counter exceeds 20 minutes (1200 seconds)
    if (counter > 1200) {
        return res.status(400).json({ error: 'Recording time limit reached. Please limit recordings to 20 minutes.' });
    }

    if (!audioFile) {
        return res.status(400).json({ error: 'No audio file uploaded' });
    }
    const fileExtension = path.extname(audioFile.originalname).slice(1).toLowerCase();
    if (!SUPPORTED_FORMATS.includes(fileExtension)) {
        fs.unlinkSync(audioFile.path); // Clean up the uploaded file
        return res.status(400).json({ error: `Unsupported file format. Supported formats are: ${SUPPORTED_FORMATS.join(', ')}` });
    }

    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(audioFile.path), audioFile.originalname);

        const config = readConfig();
        const response = await axios.post(`http://${config.ec2_ip}:8121/transcribe`, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        res.json({ transcription: response.data.text });
    } catch (error) {
        console.error('Error transcribing audio:', error.message);
        if (error.response) {
            // Server responded with a status code out of the range of 2xx
            console.error('Error response data:', error.response.data);
            res.status(error.response.status).json({ error: error.response.data });
        } else if (error.request) {
            // No response was received
            console.error('No response received:', error.request);
            res.status(500).json({ error: 'No response received from transcription service' });
        } else {
            // Other errors
            console.error('Error:', error.message);
            res.status(500).json({ error: 'An error occurred during transcription' });
        }
    } finally {
        fs.unlinkSync(audioFile.path); // Clean up the original uploaded file
    }
};

module.exports = {
    upload,
    transcribeAudioOffline
};
