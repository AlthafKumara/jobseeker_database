const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s (default)
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 10000, // Fail fast if initial connection times out
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (error.name === 'MongoServerError' && error.code === 8000) {
      console.error('❌ MongoDB Authentication Error: Invalid credentials. Please check your username and password.');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('❌ Could not connect to MongoDB Server. Please check if the server is running and accessible.');
      console.error(`   Error details: ${error.message}`);
    } else if (error.name === 'MongooseServerSelectionError') {
      console.error('❌ Failed to connect to MongoDB Atlas. Please check your internet connection and ensure your IP is whitelisted.');
    } else if (error.name === 'MongoNetworkError') {
      console.error('❌ Network Error: Could not connect to MongoDB. Please check your network connection.');
    } else {
      console.error(`❌ MongoDB Connection Error: ${error.message}`);
    }
    console.log('💡 Tip: Check your MONGO_URI in .env file and ensure your MongoDB Atlas cluster is properly configured.');
    process.exit(1);
  }
};

module.exports = connectDB;
