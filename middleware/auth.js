const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

const auth = async (req, res, next) => {
  const token = req.header('Authorization').replace('Bearer ', '');
  try {
    console.log('Auth token received:', token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded._id });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify token against hashed tokens
    const isTokenValid = await Promise.all(user.tokens.map(async (storedToken) => {
      return await bcrypt.compare(token, storedToken.token);
    }));

    if (!isTokenValid.includes(true)) {
      throw new Error('Invalid token');
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

module.exports = auth;
