const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ContextDoc = require('../models/contextDoc');
const Prompt = require('../models/Prompt');
const TranscriptionHistory = require('../models/transcriptionHistory');
const { ObjectId } = require('mongoose').Types;
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const readConfig = () => {
  const configFilePath = path.join(__dirname, 'config.json');
  const rawData = fs.readFileSync(configFilePath);
  return JSON.parse(rawData);
};

let config = readConfig();

const googleAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const geminiConfig = {
  temperature: parseFloat(config.temperature) || 0.4,
  topP: 1,
  topK: 32,
};

const geminiModel = googleAI.getGenerativeModel({
  model: 'gemini-1.5-flash-latest',
  geminiConfig,
});

const logTokenUsage = (usage) => {
  console.log(`Prompt tokens: ${usage.prompt_tokens}`);
  console.log(`Completion tokens: ${usage.completion_tokens}`);
  console.log(`Total tokens: ${usage.total_tokens}`);
};

const callOpenAIAPI = async (messages, max_tokens, temperature, seed) => {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
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
    console.error('Error calling OpenAI API:', error.response ? error.response.data : error.message);
    throw error;
  }
};

const generateResponse = async (promptConfig, retries = 3, initialDelay = 1000, modelType) => {
  let attempt = 0;
  let generatedOutput = '';

  while (attempt < retries) {
    try {
      let result;
      if (modelType === 'Gemini') {
        console.log('Using Gemini model');
        result = await geminiModel.generateContent({
          contents: [{ role: 'user', parts: promptConfig }],
        });
        const response = await result.response;
        generatedOutput += response.text();
      } else {
        console.log('Using GPT model');
        result = await callOpenAIAPI([{ role: 'user', content: promptConfig[0].text }], null, parseFloat(config.temperature) || 0.2, '');
        generatedOutput += result;
      }
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

const diagnosticUnified = async (req, res) => {
  const { email, transcription, userContext, useContextDoc } = req.body;

  if (!email || !transcription) {
    return res.status(400).json({ error: 'No email or transcription provided' });
  }

  const config = readConfig();
  const initialModelType = config.diagnosis_model === '0' ? 'GPT' : 'Gemini';

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

    const initialDiagnosisText = await generateResponse(initialPromptConfig, 3, 1000, initialModelType);

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

      const diagnosisText = await generateResponse(newPromptConfig, 3, 1000, promptObj.modelType);
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

module.exports = diagnosticUnified;
