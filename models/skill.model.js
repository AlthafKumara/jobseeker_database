const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    maxlength: 50
  }
}, {
  timestamps: true
});

const Skill = mongoose.model('Skill', skillSchema);

module.exports = Skill;
