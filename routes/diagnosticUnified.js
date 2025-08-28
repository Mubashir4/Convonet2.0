const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ContextDoc = require('../models/contextDoc');
const Prompt = require('../models/Prompt');
const TranscriptionHistory = require('../models/transcriptionHistory');
const { ObjectId } = require('mongoose').Types;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const AgentOrchestrator = require('./agentOrchestrator');
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
  const { email, transcription, userContext, sessionId } = req.body;

  if (!email || !transcription) {
    return res.status(400).json({ error: 'No email or transcription provided' });
  }

  try {
    // Create orchestrator instance
    const orchestrator = new AgentOrchestrator();
    
    // Set up real-time event streaming if socket.io is available
    const io = req.app.get('io');
    const socketSessionId = sessionId || `session_${Date.now()}`;
    
    if (io) {
      // Set up event listeners for real-time updates
      orchestrator.on('workflowStarted', (data) => {
        io.to(socketSessionId).emit('workflowStarted', data);
      });
      
      orchestrator.on('planCreated', (data) => {
        io.to(socketSessionId).emit('planCreated', data);
      });
      
      orchestrator.on('phaseStarted', (data) => {
        io.to(socketSessionId).emit('phaseStarted', data);
      });
      
      orchestrator.on('agentStarted', (data) => {
        io.to(socketSessionId).emit('agentStarted', data);
      });
      
      orchestrator.on('agentThought', (data) => {
        io.to(socketSessionId).emit('agentThought', data);
      });
      
      orchestrator.on('agentAction', (data) => {
        io.to(socketSessionId).emit('agentAction', data);
      });
      
      orchestrator.on('agentObservation', (data) => {
        io.to(socketSessionId).emit('agentObservation', data);
      });
      
      orchestrator.on('agentCompleted', (data) => {
        io.to(socketSessionId).emit('agentCompleted', data);
      });
      
      orchestrator.on('phaseCompleted', (data) => {
        io.to(socketSessionId).emit('phaseCompleted', data);
      });
      
      orchestrator.on('workflowCompleted', (data) => {
        io.to(socketSessionId).emit('workflowCompleted', data);
      });
      
      orchestrator.on('agentError', (data) => {
        io.to(socketSessionId).emit('agentError', data);
      });
      
      orchestrator.on('workflowError', (data) => {
        io.to(socketSessionId).emit('workflowError', data);
      });
    }

    // Execute the agent workflow with modern orchestration
    const responses = await orchestrator.executeAgentWorkflow(
      email, 
      transcription, 
      userContext, 
      io, 
      socketSessionId
    );

    // Save transcription history with enhanced metadata
    const newEntry = new TranscriptionHistory({
      email,
      transcription,
      diagnosisText: responses.join('\n\n--- Agent Separator ---\n\n'),
      sessionId: socketSessionId,
      agentCount: responses.length,
      createdAt: new Date(),
    });
    await newEntry.save();

    // Clean up old entries
    const historyCount = await TranscriptionHistory.countDocuments({ email });
    if (historyCount > 30) {
      const oldestEntry = await TranscriptionHistory.findOne({ email }).sort({ createdAt: 1 });
      if (oldestEntry) {
        await TranscriptionHistory.findByIdAndDelete(oldestEntry._id);
      }
    }

    // Return responses with metadata
    res.json({ 
      responses,
      sessionId: socketSessionId,
      agentCount: responses.length,
      executionTime: Date.now() - (req.startTime || Date.now())
    });

  } catch (error) {
    console.error(`Error processing request: ${error.message}`);
    res.status(500).json({ 
      error: 'An error occurred during processing',
      details: error.message 
    });
  }
};

module.exports = diagnosticUnified;