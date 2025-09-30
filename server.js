require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./models/db');

// Import routes
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/company');
const societyRoutes = require('./routes/society');
const skillRoutes = require('./routes/skill');
const positionRoutes = require('./routes/position');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Connect to MongoDB (langsung connect, tanpa app.listen)
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/societies', societyRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/positions', positionRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to JobSeeker API' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// MongoDB connection logs
mongoose.connection.once('open', () => {
  console.log('✅ Connected to MongoDB');
});
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Export app for Vercel (penting!)
module.exports = app;
