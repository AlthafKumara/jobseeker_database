const mongoose = require('mongoose');

const availablePositionSchema = new mongoose.Schema({
  position_name: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  description: {
    type: String,
    required: true
  },
  submission_start_date: {
    type: Date,
    required: true
  },
  submission_end_date: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.submission_start_date;
      },
      message: 'End date must be after start date'
    }
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
availablePositionSchema.index({ company: 1, is_active: 1 });

const AvailablePosition = mongoose.model('AvailablePosition', availablePositionSchema);
module.exports = AvailablePosition;
