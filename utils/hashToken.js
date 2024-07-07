const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Function to generate a token and hash it
const generateHashedToken = async (user) => {
  try {
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '5h' });
    const hashedToken = await bcrypt.hash(token, 8);
    return { token, hashedToken };
  } catch (error) {
    throw new Error('Error generating token');
  }
};

// Function to verify a hashed token
const verifyHashedToken = async (token, hashedToken) => {
  try {
    const isMatch = await bcrypt.compare(token, hashedToken);
    return isMatch;
  } catch (error) {
    throw new Error('Error verifying token');
  }
};

module.exports = { generateHashedToken, verifyHashedToken };
