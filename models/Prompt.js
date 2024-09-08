const mongoose = require('mongoose');

const promptSchema = new mongoose.Schema({
  agentName: {
    type: String,
    required: true,
    unique: true,
  },
  prompt: {
    type: String,
    required: true,
  },
  modelType: {
    type: String,
    required: true,
    enum: ['gpt-4o', 'gpt-4o-mini', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    default: 'gpt-4o-mini',
  },
  contextDocs: {
    type: [String],
    default: [],
  },
  connectedAgents: {
    type: [String],
    default: [],
  },
  transcript: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  userName: { 
    type: String,
    required: true,
  }
});

const Prompt = mongoose.model('Prompt', promptSchema);

module.exports = Prompt;
