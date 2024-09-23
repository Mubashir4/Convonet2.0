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

const generateResponse = async (promptConfig, retries = 3, initialDelay = 1000, modelType, temperature = 0.2) => {
  let attempt = 0;
  let generatedOutput = '';

  // Determine model type logic
  const isOpenAIModel = modelType === 'gpt-4o' || modelType === 'gpt-4o-mini';
  const isGeminiModel = modelType === 'gemini-1.5-flash' || modelType === 'gemini-1.5-pro';
  const finalModelType = isOpenAIModel ? modelType : isGeminiModel ? modelType : 'gpt-4o-mini';

  while (attempt < retries) {
    try {
      let result;
      if (isGeminiModel) {
        console.log('Using Gemini model:', finalModelType);
        result = await geminiModel.generateContent({
          contents: [{ role: 'user', parts: promptConfig }],
        });
        const response = await result.response;
        generatedOutput += response.text();
      } else {
        console.log('Using OpenAI GPT model:', finalModelType);
        result = await callOpenAIAPI(
          [{ role: 'user', content: promptConfig[0].text }],
          null,
          parseFloat(temperature) || 0.2,
          ''
        );
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
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};


const diagnosticUnified = async (req, res) => {
  const { email, transcription, userContext } = req.body; // Removed useContextDoc since we no longer need this flag

  if (!email || !transcription) {
    return res.status(400).json({ error: 'No email or transcription provided' });
  }

  const config = readConfig();
  const defaultModelType = config.diagnosis_model === '0' ? 'gpt-4o-mini' : 'gemini-1.5-flash';

  try {
    // Fetch any prompts associated with the user
    const prompts = await Prompt.find({ userName: email.trim() });

    // Default mode: no prompts, no contextDocs, just the transcription
    if (prompts.length === 0) {
      let initialPromptText = `Answer me:\n'${transcription}'`;

      let initialPromptConfig = [{ text: initialPromptText }];
      const initialDiagnosisText = await generateResponse(initialPromptConfig, 3, 1000, defaultModelType, 0.2);

      // Save the initial transcription history
      let newEntry = new TranscriptionHistory({
        email,
        transcription,
        diagnosisText: initialDiagnosisText,
        createdAt: new Date(),
      });
      await newEntry.save();

      return res.json({ responses: [initialDiagnosisText] });
    } 

    // If prompts exist, process them one by one, using the models and contextDocs specified in each prompt
    const diagnosisResponses = [];

    // Temporary storage for responses that may be needed as context for later prompts
    let promptResponseMap = {};

    for (let i = 0; i < prompts.length; i++) {
      const promptObj = prompts[i];
      
      // Fetch contextDocs specified in the prompt
      let promptContextDocsText = '';
      if (promptObj.contextDocs && promptObj.contextDocs.length > 0) {
        const contextDocs = await ContextDoc.find({ name: { $in: promptObj.contextDocs }, active: true });
        promptContextDocsText = contextDocs.map(doc => doc.text).join('\n');
      }

      // Construct the full context for the prompt, combining contextDocs and userContext
      let promptContext = `${promptContextDocsText}${userContext ? `\n${userContext}` : ''}`;

      // If the prompt includes previous agent responses, add them
      let agentResponses = '';
      if (promptObj.connectedAgents && promptObj.connectedAgents.length > 0) {
        const agentNames = promptObj.connectedAgents.join(', ');
        agentResponses = `Agent responses: ${agentNames}`;
      }

      // Check if the transcript needs to be included
      let transcriptText = promptObj.transcript ? `\nThe Transcript: ${transcription}` : '';

      // Build the prompt query for the first prompt differently
      let promptConfig;
      if (i === 0) {
        // First prompt specifically answers the transcription
        promptConfig = [
          {
            text: `Having context:\n'${promptContext}' Answer me:\n${transcriptText}`,
          },
        ];
      } else {
        // Subsequent prompts can follow the regular format
        promptConfig = [
          {
            text: `Having context:\n'${promptContext}'${transcriptText ? `\n${transcriptText}` : ''}\n${agentResponses}\nApply prompt:\n${promptObj.prompt}`,
          },
        ];
      }

      // Use the model and temperature specified in the prompt
      const diagnosisText = await generateResponse(
        promptConfig,
        3,
        1000,
        promptObj.modelType,
        promptObj.temperature || 0.3 // Use temperature from prompt or default to 0.3
      );
      diagnosisResponses.push(diagnosisText);

      // Save the response to the map in case it is needed for later prompts
      promptResponseMap[promptObj.agentName] = diagnosisText;

      // Save each prompt's transcription history
      let newEntry = new TranscriptionHistory({
        email,
        transcription: promptConfig[0].text,
        diagnosisText,
        createdAt: new Date(),
      });
      await newEntry.save();

      // Check and clean up older transcription history
      const historyCount = await TranscriptionHistory.countDocuments({ email });
      if (historyCount > 30) {
        const oldestEntry = await TranscriptionHistory.findOne({ email }).sort({ createdAt: 1 });
        if (oldestEntry) {
          await TranscriptionHistory.findByIdAndDelete(oldestEntry._id);
        }
      }
    }

    // Return all diagnosis responses
    res.json({ responses: diagnosisResponses });

  } catch (error) {
    console.error(`Error processing request: ${error.message}`);
    res.status(500).json({ error: 'An error occurred during processing' });
  }
};

module.exports = diagnosticUnified;