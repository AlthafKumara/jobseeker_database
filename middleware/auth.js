const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Middleware to verify JWT token
exports.auth = async (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Middleware to check if user is HRD
exports.isHRD = (req, res, next) => {
  if (req.user && req.user.role === 'HRD') {
    return next();
  }
  return res.status(403).json({ msg: 'Access denied. HRD role required.' });
};

// Middleware to check if user is Society
exports.isSociety = (req, res, next) => {
  if (req.user && req.user.role === 'Society') {
    return next();
  }
  return res.status(403).json({ msg: 'Access denied. Society role required.' });
};

// Middleware to get user profile based on role
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    let profile;
    if (user.role === 'HRD') {
      profile = await Company.findOne({ user: user._id });
    } else {
      profile = await Society.findOne({ user: user._id });
    }

    req.profile = profile;
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
