const mongoose = require('mongoose');

const societySchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  date_of_birth: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    enum: ['', 'Male', 'Female', 'Other'],
    default: ''
  },
  profile_photo: {
    type: String,
    default: ''
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const Society = mongoose.model('Society', societySchema);
module.exports = Society;
