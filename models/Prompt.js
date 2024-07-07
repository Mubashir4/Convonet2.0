const mongoose = require('mongoose');

const promptSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const Prompt = mongoose.model('Prompt', promptSchema);

module.exports = Prompt;
