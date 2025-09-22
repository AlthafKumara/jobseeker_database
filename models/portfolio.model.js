const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  skills: [{
    type: String,
    required: true,
    trim: true
  }],
  description: {
    type: String,
    required: true
  },
  file: {
    type: String,
    required: true
  },
  society: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Society',
    required: true
  }
}, {
  timestamps: true
});

const Portfolio = mongoose.model('Portfolio', portfolioSchema);
module.exports = Portfolio;
