const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ContextDoc = require('../models/contextDoc');
const Prompt = require('../models/Prompt');
const TranscriptionHistory = require('../models/transcriptionHistory');
const { ObjectId } = require('mongoose').Types;
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}
const googleAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const readConfig = () => {
  const configFilePath = path.join(__dirname, 'config.json');
  const rawData = fs.readFileSync(configFilePath);
  return JSON.parse(rawData);
};

let config = readConfig();

const geminiConfig = {
  temperature: parseFloat(config.temperature) || 0.4,
  topP: 1,
  topK: 32,
};

const geminiModel = googleAI.getGenerativeModel({
  model: 'gemini-1.5-flash-latest',
  geminiConfig,
});

const generateResponse = async (promptConfig, retries = 3, initialDelay = 1000) => {
  let attempt = 0;
  let generatedOutput = '';

  while (attempt < retries) {
    try {
      const result = await geminiModel.generateContent({
        contents: [{ role: 'user', parts: promptConfig }],
      });
      const response = await result.response;
      generatedOutput += response.text();
      return generatedOutput;
    } catch (error) {
      console.error(`Error generating response: ${error.message}`);
      attempt++;
      if (attempt >= retries) {
        return generatedOutput;
      }
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const diagnosticGemini = async (req, res) => {
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

    let extendedContextText = `${contextDocText}${userContext ? `\n${userContext}` : ''}`;
    let initialPromptText = extendedContextText
      ? `Having context:\n'${extendedContextText}'\nAnswer me:\n'${transcription}'`
      : `Answer me:\n'${transcription}'`;

    let initialPromptConfig = [{ text: initialPromptText }];

    const initialDiagnosisText = await generateResponse(initialPromptConfig);

    let newEntry = new TranscriptionHistory({
      email,
      transcription,
      diagnosisText: initialDiagnosisText,
      createdAt: new Date(),
    });
    await newEntry.save();

    const prompts = await Prompt.find();
    const diagnosisResponses = [initialDiagnosisText];

    for (const promptObj of prompts) {
      const newPromptConfig = [
        { text: `Having context:\n'${extendedContextText}'\n and original response ${initialDiagnosisText}\nApply prompt:\n${promptObj.text}\nElaborate each part further` },
      ];

      const diagnosisText = await generateResponse(newPromptConfig);
      diagnosisResponses.push(diagnosisText);

      newEntry = new TranscriptionHistory({
        email,
        transcription: newPromptConfig[0].text,
        diagnosisText,
        createdAt: new Date(),
      });
      await newEntry.save();

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
    console.error(`Error processing request: ${error.message}`);
    res.status(500).json({ error: 'An error occurred during processing' });
  }
};

module.exports = diagnosticGemini;
