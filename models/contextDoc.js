const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Schema = mongoose.Schema;

const ContextDocSchema = new Schema({
  email: { type: String, required: true },
  text: { type: String, required: true },
  name: { type: String, required: true },
  updated_at: { type: Date, default: Date.now },
  active: { type: Boolean, default: false },
  userSelected: { type: Boolean, default: false },
  unique_id: { type: String, unique: true, default: uuidv4 }
});

module.exports = mongoose.model('ContextDoc', ContextDocSchema);
