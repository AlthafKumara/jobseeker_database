const mongoose = require('mongoose');

const positionAppliedSchema = new mongoose.Schema({
  available_position: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AvailablePosition',
    required: true
  },
  society: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Society',
    required: true
  },
  portfolio: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Portfolio',
  required: true
},

  apply_date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
    default: 'PENDING'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Create a compound index to ensure one application per position per society
positionAppliedSchema.index(
  { available_position: 1, society: 1 },
  { unique: true }
);

const PositionApplied = mongoose.model('PositionApplied', positionAppliedSchema);
module.exports = PositionApplied;
