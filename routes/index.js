const express = require('express');
const router = express.Router();
const diagnosticGeminiRouter = require('./diagnosticGemini'); // Updated import
const contextDocRouter = require('./contextDocRouter');
const { transcribeAudio, upload } = require('./OpenAITranscribe');
const { transcribeAudioOffline } = require('./OfflineTranscribe');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const docxParser = require('docx-parser');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const TranscriptionHistory = require('../models/transcriptionHistory');
const ContextDoc = require('../models/contextDoc'); 
const Prompt = require('../models/Prompt'); 
const SUPPORTED_FORMATS = ['wav', 'mp3', 'm4a', 'flac'];

const configFilePath = path.join(__dirname, 'config.json');

// Read the config file
const readConfig = () => {
  const rawData = fs.readFileSync(configFilePath);
  return JSON.parse(rawData);
};

// Write to the config file
const writeConfig = (config) => {
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
};

// Middleware to handle JSON and URL-encoded form data
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Save config route
router.post('/saveConfig', (req, res) => {
  const { n, temperature, audio_model, ec2_ip } = req.body;
  let config = readConfig();
  config.n = n;
  config.temperature = temperature;
  config.audio_model = audio_model;
  config.ec2_ip = ec2_ip; // Save EC2 IP
  writeConfig(config);
  res.status(200).json({ msg: 'Configuration saved' });
});

// Fetch config route
router.get('/getConfig', (req, res) => {
  try {
    const config = readConfig();
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ msg: 'Error fetching configuration' });
  }
});

// Route to handle audio transcription
router.post('/transcribe', upload.single('audio'), (req, res) => {
  const config = readConfig();
  if (config.audio_model === '1') {
    transcribeAudioOffline(req, res);
  } else {
    transcribeAudio(req, res);
  }
});

// Route to handle file upload and text extraction
router.use('/contextDocs', contextDocRouter);

// Use the diagnosticGemini router
router.use('/diagnose', diagnosticGeminiRouter); // Updated router usage

// Signup route
router.post('/signup', async (req, res) => {
  const { role, name, email, password, phone, recaptchaToken } = req.body;

  // Verify reCAPTCHA
  const secretKey = '6Lf2tAIqAAAAAKgvusFV0nev5CvNv_FhHOs1kwJS'; // Replace with your reCAPTCHA secret key
  const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;

  try {
    const response = await axios.post(verificationUrl);
    const { success } = response.data;

    if (!success) {
      return res.status(400).json({ msg: 'reCAPTCHA verification failed. Please try again.' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ name, email, password, number: phone, role });
    await user.save();

    res.status(201).json({ msg: 'User registered successfully', user });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ msg: 'Server error', error });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    if (!user.user_active) {
      return res.status(400).json({ msg: 'User is not active' });
    }
    const token = await user.generateAuthToken();
    res.status(200).json({ msg: 'Login successful', user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ msg: 'Server error', error });
  }
});

// Route to fetch doctor name and role
router.get('/doctor', async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    if (user) {
      res.status(200).json({ name: user.name, role: user.role });
    } else {
      res.status(404).json({ msg: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update user
router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all prompts
router.get('/prompts', async (req, res) => {
  try {
    const prompts = await Prompt.find();
    res.json(prompts);
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
});

const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Create or update prompts
router.post('/prompts', async (req, res) => {
  const { prompts } = req.body;
  try {
    // Clear existing prompts
    await Prompt.deleteMany({});
    
    // Convert _id to ObjectId if necessary
    const formattedPrompts = prompts.map(prompt => ({
      ...prompt,
      _id: ObjectId.isValid(prompt._id) ? prompt._id : new ObjectId(),
    }));

    // Save new prompts
    const createdPrompts = await Prompt.insertMany(formattedPrompts);
    res.status(201).json(createdPrompts);
  } catch (error) {
    console.error('Error saving prompts:', error.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete a prompt
router.delete('/prompts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const prompt = await Prompt.findByIdAndDelete(id);
    if (!prompt) {
      return res.status(404).json({ msg: 'Prompt not found' });
    }
    res.status(200).json({ msg: 'Prompt deleted successfully' });
  } catch (error) {
    console.error('Error deleting prompt:', error.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Route to save transcription history
router.post('/saveTranscription', async (req, res) => {
  const { email, transcription } = req.body;
  if (!email || !transcription) {
    return res.status(400).json({ msg: 'Email and transcription are required' });
  }

  try {
    const now = new Date(); // Get the current date and time
    const newEntry = new TranscriptionHistory({
      email,
      transcription,
      createdAt: now // Set the createdAt field explicitly
    });

    // Save the new entry
    await newEntry.save();

    // Ensure the user has at most 30 records
    const historyCount = await TranscriptionHistory.countDocuments({ email });

    if (historyCount > 30) {
      const oldestEntry = await TranscriptionHistory.findOne({ email }).sort({ createdAt: 1 });
      if (oldestEntry) {
        await TranscriptionHistory.findByIdAndDelete(oldestEntry._id);
      }
    }

    res.status(200).json({ msg: 'Transcription saved successfully' });
  } catch (error) {
    console.error('Error saving transcription:', error);
    res.status(500).json({ msg: 'Server error', error });
  }
});

// Route to fetch transcription history for a user's email
router.get('/getTranscriptionHistory', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const history = await TranscriptionHistory.find({ email }).sort({ createdAt: 1 });
    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching transcription history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
