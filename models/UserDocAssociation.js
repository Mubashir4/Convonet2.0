const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserDocAssociationSchema = new Schema({
  useremail: { type: String, required: true, ref: 'User' },
  doc_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'ContextDoc' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserDocAssociation', UserDocAssociationSchema);
