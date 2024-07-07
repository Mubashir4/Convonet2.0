const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config();

async function createUser() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const user = new User({
    name: 'Admin',
    email: 'mubashirimran@hotmail.com',
    password: 'abc@123',
    number: '123',
    user_active: true,
    role: 'admin'
  });

  try {
    await user.save();
    console.log('User created successfully:', user);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    mongoose.connection.close();
  }
}

createUser();
