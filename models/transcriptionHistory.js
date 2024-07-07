const mongoose = require('mongoose');

const TranscriptionHistorySchema = new mongoose.Schema({
  email: { type: String, required: true },
  transcription: { type: String, required: true },
  diagnosisText: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const TranscriptionHistory = mongoose.model('TranscriptionHistory', TranscriptionHistorySchema);

module.exports = TranscriptionHistory;
