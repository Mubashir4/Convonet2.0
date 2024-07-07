const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ContextDoc = require('../models/contextDoc');
const Prompt = require('../models/Prompt');
const TranscriptionHistory = require('../models/transcriptionHistory');
const { ObjectId } = require('mongoose').Types;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const readConfig = () => {
  const configFilePath = path.join(__dirname, 'config.json');
  const rawData = fs.readFileSync(configFilePath);
  return JSON.parse(rawData);
};

let config = readConfig();

// Function to log token usage
const logTokenUsage = (usage) => {
  console.log(`Prompt tokens: ${usage.prompt_tokens}`);
  console.log(`Completion tokens: ${usage.completion_tokens}`);
  console.log(`Total tokens: ${usage.total_tokens}`);
};

// Function to call OpenAI API
const callOpenAIAPI = async (messages, max_tokens, temperature, seed) => {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: messages,
      max_tokens: max_tokens,
      n: parseInt(config.n) || 1,
      stop: null,
      temperature: temperature,
      user: seed // Use different seed for different requests
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    logTokenUsage(response.data.usage);
    return response.data.choices[0].message.content;
  } catch (error) {
    // Check if the error is due to token limit exceeded
    if (error.response && error.response.data && error.response.data.error) {
      const apiError = error.response.data.error;
      if (apiError.type === 'invalid_request_error' && apiError.message.includes('max_tokens')) {
        console.error('Token limit exceeded, retrying...');
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
};

// Function to handle retries with concatenation and exponential backoff
const generateResponse = async (messages, max_tokens = null, retries = 3, initialDelay = 1000, temperature, seed) => {
  let attempt = 0;
  let generatedOutput = ''; // Store generated output so far

  while (attempt < retries) {
    try {
      const response = await callOpenAIAPI(messages, max_tokens, temperature, seed);
      generatedOutput += response; // Concatenate new response
      return generatedOutput;
    } catch (error) {
      attempt++;
      if (attempt >= retries) {
        return generatedOutput; // Return what we have so far
      }
      const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay)); // Delay before retrying

      // Prepare messages for continuation
      messages.push({
        role: 'assistant',
        content: generatedOutput // Pass the generated output so far
      });
    }
  }
};

router.post('/', async (req, res) => {
  const { email, transcription, userContext, useContextDoc } = req.body;

  if (!email || !transcription) {
    return res.status(400).json({ error: 'No email or transcription provided' });
  }

  try {
    let contextDocText = '';
    if (useContextDoc) {
      const activeContextDocs = await ContextDoc.find({ active: true });
      contextDocText = activeContextDocs.map(doc => doc.text).join('\n');
    }

    let extendedContextText = `${contextDocText}\n${userContext}\n`;
    let text = `Having context:\n'${extendedContextText}'\nAnswer me:\n'${transcription}'`;

    // Prepare the initial messages
    let messages = [
      {
        role: 'user',
        content: text
      }
    ];

    // Send the initial transcription to OpenAI API
    const originalTemperature = parseFloat(config.temperature) || 0.2;
    const seedOriginal = email + transcription; // Example seed for original query
    const initialDiagnosisText = await generateResponse(messages, null, 3, 1000, originalTemperature, seedOriginal);

    // Save the initial transcription and diagnosis
    let newEntry = new TranscriptionHistory({
      email,
      transcription,
      diagnosisText: initialDiagnosisText,
      createdAt: new Date()
    });
    await newEntry.save();

    // Process prompts asynchronously
    const prompts = await Prompt.find();
    const diagnosisResponses = [initialDiagnosisText];

    for (const prompt of prompts) {
      const newText = `Having context:\n'${extendedContextText}'\n and original response ${initialDiagnosisText}\nApply prompt:\n${prompt.text}\nElaborate each part further`;

      // Update messages for the new prompt
      messages = [
        {
          role: 'user',
          content: newText
        }
      ];

      const promptTemperature = originalTemperature + 0.1;
      const seedPrompt = email + prompt.text; // Example different seed for prompt
      const diagnosisText = await generateResponse(messages, null, 3, 1000, promptTemperature, seedPrompt);
      diagnosisResponses.push(diagnosisText);

      // Save each prompt's transcription and diagnosis
      newEntry = new TranscriptionHistory({
        email,
        transcription: newText,
        diagnosisText,
        createdAt: new Date()
      });
      await newEntry.save();

      // Ensure the user has at most 30 records
      const historyCount = await TranscriptionHistory.countDocuments({ email });
      if (historyCount > 30) {
        const oldestEntry = await TranscriptionHistory.findOne({ email }).sort({ createdAt: 1 });
        if (oldestEntry) {
          await TranscriptionHistory.findByIdAndDelete(oldestEntry._id);
        }
      }
    }

    res.json({ responses: diagnosisResponses });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred during processing' });
  }
});

module.exports = router;
