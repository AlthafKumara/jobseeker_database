const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  skills: [{
    type: String,
    default: '',
    trim: true
  }],
  description: {
    type: String,
    required: true,
    default: ''
  },
  file: {
    type: String,
    default: ''
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
