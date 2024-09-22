const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  number: { type: String, required: false },
  user_active: { type: Boolean, default: false },
  role: { type: String, enum: ['admin', 'doctor'], required: true },
  tokens: [{ token: { type: String, required: true } }],
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
});

// Hash the password before saving the user
UserSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

// Method to generate auth token
UserSchema.methods.generateAuthToken = async function() {
  const user = this;
  try {
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const hashedToken = await bcrypt.hash(token, 8);
    user.tokens = user.tokens.concat({ token: hashedToken });
    await user.save();
    return token;
  } catch (error) {
    console.error('Error generating auth token:', error);
    throw new Error('Error generating auth token');
  }
};

module.exports = mongoose.model('User', UserSchema);
