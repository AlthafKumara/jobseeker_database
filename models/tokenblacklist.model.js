const mongoose = require('mongoose');

const TokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
});

TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); 
// ⏰ Token akan otomatis dihapus setelah expired

module.exports = mongoose.model('TokenBlacklist', TokenBlacklistSchema);
