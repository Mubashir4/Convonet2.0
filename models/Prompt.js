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
  userName: { 
    type: String,
    required: true,
  },
  order: {  // New field added for ordering
    type: Number,
    default: 0,
  },
  temperature: { // New field for temperature
    type: Number,
    required: true,
    min: 0.0,
    max: 2.0,
    default: 0.3,
  },
}, { timestamps: true });

const Prompt = mongoose.model('Prompt', promptSchema);

module.exports = Prompt;