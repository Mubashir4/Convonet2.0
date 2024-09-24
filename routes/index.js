const express = require('express');
const router = express.Router();
const diagnosticGemini = require('./diagnosticGemini'); // Updated import
const diagnostic = require('./diagnostic'); // Updated import
const diagnosticUnified = require('./diagnosticUnified');
const contextDocRouter = require('./contextDocRouter');
const { transcribeAudio, upload } = require('./OpenAITranscribe');
const { transcribeAudioOffline } = require('./OfflineTranscribe');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const crypto = require('crypto');
const transporter = require('../utils/mailer');
const TranscriptionHistory = require('../models/transcriptionHistory');
const Prompt = require('../models/Prompt'); 
const SUPPORTED_FORMATS = ['wav', 'mp3', 'm4a', 'flac'];

const configFilePath = path.join(__dirname, 'config.json');

const envFilePath = path.join(__dirname, './.env');

// Load .env file
const loadEnv = () => {
  console.log('Loading .env file');
  const env = dotenv.parse(fs.readFileSync(envFilePath));
  console.log('Loaded .env file:', env);
  return env;
};

// Save to .env file
const saveEnv = (env) => {
  console.log('Saving to .env file:', env);
  const envString = Object.keys(env)
    .map(key => `${key}=${env[key]}`)
    .join('\n');
  fs.writeFileSync(envFilePath, envString);
  console.log('Saved .env file');
};

// Fetch keys
router.get('/api/keys', (req, res) => {
  console.log('GET /api/keys request received');
  try {
    const env = loadEnv();
    res.json({
      OPENAI_API_KEY: env.OPENAI_API_KEY,
      GEMINI_API_KEY: env.GEMINI_API_KEY
    });
    console.log('Responded with keys:', {
      OPENAI_API_KEY: env.OPENAI_API_KEY,
      GEMINI_API_KEY: env.GEMINI_API_KEY
    });
  } catch (error) {
    console.error('Error fetching keys:', error);
    res.status(500).json({ msg: 'Error fetching keys' });
  }
});

// Update keys
router.post('/api/keys', (req, res) => {
  console.log('POST /api/keys request received with body:', req.body);
  try {
    const { OPENAI_API_KEY, GEMINI_API_KEY } = req.body;
    let env = loadEnv();
    env.OPENAI_API_KEY = OPENAI_API_KEY;
    env.GEMINI_API_KEY = GEMINI_API_KEY;
    saveEnv(env);
    res.status(200).json({ msg: 'Keys updated successfully' });
    console.log('Keys updated successfully');
  } catch (error) {
    console.error('Error updating keys:', error);
    res.status(500).json({ msg: 'Error updating keys' });
  }
});

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
  const { n, temperature, audio_model, ec2_ip, diagnosis_model } = req.body; // Add diagnosis_model here
  let config = readConfig();
  config.n = n;
  config.temperature = temperature;
  config.audio_model = audio_model;
  config.ec2_ip = ec2_ip; // Save EC2 IP
  config.diagnosis_model = diagnosis_model; // Save diagnosis model
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
// Use the correct diagnostic router based on the diagnosis_model value
/*
router.post('/diagnose', (req, res, next) => {
  const config = readConfig();
  console.log(config.diagnosis_model);
  if (config.diagnosis_model === '0') {
    diagnostic(req, res, next); // GPT Model
  } else {
    diagnosticGemini(req, res, next); // Gemini Model
  }
});
*/

router.post('/diagnose', (req, res, next) => {
  diagnosticUnified(req, res, next);
});

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

// Password reset request
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'No account with that email found.' });
    }

    // Generate a token
    const token = crypto.randomBytes(20).toString('hex');

    // Set token and expiration on user model
    const expirationTime = Date.now() + 3600000 * 24; // 24 hours for testing
    user.resetPasswordToken = token;
    user.resetPasswordExpires = expirationTime;

    console.log('Token generated:', token);
    console.log('Expiration time:', new Date(expirationTime).toISOString());

    await user.save();

    // Send email
    const resetURL = `https://app.convonote.com/reset-password/${token}`;
    const mailOptions = {
      to: user.email,
      from: 'begin@convonote.com',
      subject: 'Password Reset',
      text: `You are receiving this because you (or someone else) have requested the reset of the password.\n\n
        Please click on the following link, or paste it into your browser to complete the process:\n\n
        ${resetURL}\n\n
        If you did not request this, please ignore this email.\n`
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error('Mail sending error:', err);
        return res.status(500).json({ msg: 'Error sending email' });
      }
      res.status(200).json({ msg: 'Reset link sent to your email' });
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ msg: 'Server error', error });
  }
});

// Set new password
router.post('/new-password', async (req, res) => {
  const { token, password } = req.body;
  try {
    const user = await User.findOne({ 
      resetPasswordToken: token
    });

    if (!user) {
      console.log('User not found with token:', token);
      return res.status(400).json({ msg: 'Password reset token is invalid.' });
    }

    console.log('User found:', user.email);
    console.log('Token expiration:', user.resetPasswordExpires);
    console.log('Current time:', new Date());

    if (user.resetPasswordExpires < Date.now()) {
      console.log('Token has expired');
      return res.status(400).json({ msg: 'Password reset token has expired.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ msg: 'Password has been reset successfully' });
  } catch (error) {
    console.error('New password error:', error);
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

const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;


// Get all agents with filtering based on current prompt order
router.get('/agents', async (req, res) => {
  try {
    // Fetch all prompts from the database
    const prompts = await Prompt.find().sort({ created_at: 1 });

    // Transform prompts into an array of agent objects
    const agents = prompts.map(prompt => ({
      _id: prompt._id,
      agentName: prompt.agentName,
    }));

    res.json(agents); // Send the array of agents
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});


// Helper function to validate connectedAgents
const validateConnectedAgents = async (connectedAgents) => {
  if (!Array.isArray(connectedAgents)) return false;
  for (let agentName of connectedAgents) {
    const exists = await Prompt.findOne({ agentName });
    if (!exists) {
      return false;
    }
  }
  return true;
};

// -------------------
// Reorder Prompts Route
// -------------------
router.put('/prompts/reorder', async (req, res) => {
  const { orderedPromptIds } = req.body; // Array of prompt IDs in the desired order

  if (!Array.isArray(orderedPromptIds)) {
    return res.status(400).json({ msg: 'orderedPromptIds must be an array' });
  }

  try {
    for (let index = 0; index < orderedPromptIds.length; index++) {
      await Prompt.findByIdAndUpdate(orderedPromptIds[index], { order: index });
    }
    res.status(200).json({ msg: 'Prompts reordered successfully' });
  } catch (error) {
    console.error('Error reordering prompts:', error.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// -------------------
// Create a New Prompt
// -------------------
router.post('/prompts', async (req, res) => {
  const { agentName, prompt, modelType, contextDocs, connectedAgents, transcript, userName, temperature } = req.body;

  // Validate connectedAgents
  if (connectedAgents && !(await validateConnectedAgents(connectedAgents))) {
    return res.status(400).json({ msg: 'One or more connected agents do not exist' });
  }

  try {
    let existingPrompt = await Prompt.findOne({ agentName });

    if (existingPrompt) {
      return res.status(400).json({ msg: 'Agent name already exists' });
    } else {
      const totalPrompts = await Prompt.countDocuments();
      const newPrompt = new Prompt({
        agentName,
        prompt,
        modelType,
        contextDocs,
        connectedAgents,
        transcript,
        userName,
        temperature: temperature !== undefined ? temperature : 0.3, // Default to 0.3 if not provided
        order: totalPrompts // Assign order based on current count
      });
      await newPrompt.save();
      res.status(201).json(newPrompt);
    }
  } catch (error) {
    console.error('Error saving prompt:', error.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// -------------------
// Update an Existing Prompt
// -------------------
router.put('/prompts/:id', async (req, res) => {
  const { id } = req.params;
  const { prompt, modelType, contextDocs, connectedAgents, transcript, userName, order, temperature } = req.body;

  // Validate connectedAgents
  if (connectedAgents && !(await validateConnectedAgents(connectedAgents))) {
    return res.status(400).json({ msg: 'One or more connected agents do not exist' });
  }

  try {
    const existingPrompt = await Prompt.findById(id);
    if (!existingPrompt) {
      return res.status(404).json({ msg: 'Prompt not found' });
    }

    // Update fields except agentName
    existingPrompt.prompt = prompt || existingPrompt.prompt;
    existingPrompt.modelType = modelType || existingPrompt.modelType;
    existingPrompt.contextDocs = contextDocs || existingPrompt.contextDocs;
    existingPrompt.connectedAgents = connectedAgents || existingPrompt.connectedAgents;
    existingPrompt.transcript = transcript !== undefined ? transcript : existingPrompt.transcript;
    existingPrompt.userName = userName || existingPrompt.userName;
    existingPrompt.order = order !== undefined ? order : existingPrompt.order;
    existingPrompt.temperature = temperature !== undefined ? temperature : existingPrompt.temperature;

    await existingPrompt.save();
    res.status(200).json(existingPrompt);
  } catch (error) {
    console.error('Error updating prompt:', error.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// -------------------
// Get All Prompts (Ordered)
// -------------------
router.get('/prompts', async (req, res) => {
  try {
    const prompts = await Prompt.find().sort({ order: 1 });
    res.json(prompts);
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// -------------------
// Delete a Prompt
// -------------------
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

module.exports = router;

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
