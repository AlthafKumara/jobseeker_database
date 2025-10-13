const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const User = require('../models/user.model');
const Society = require('../models/society.model');
const Company = require('../models/company.model');
const { auth } = require('../middleware/auth');
const {upload} = require('../middleware/upload');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user (Society or HRD)
// @access  Public
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('role', 'Role is required').isIn(['HRD', 'Society']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { name, email, password, role } = req.body;

    try {
      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ 
          success: false,
          error: 'User already exists' 
        });
      }

      // Create user
      user = new User({
        name,
        email,
        password, 
        role
      });

      // Save user - password will be hashed by the pre-save hook
      await user.save();

      // Create empty profile based on role
      try {
        if (role === 'Society') {
          await new Society({ user: user._id }).save();
        } else if (role === 'HRD') {
          await new Company({ user: user._id }).save();
        }

        // Generate JWT
        const payload = {
          user: {
            id: user.id,
            role: user.role
          }
        };

        jwt.sign(
          payload,
          process.env.JWT_SECRET,
          { expiresIn: '7d' },
          (err, token) => {
            if (err) throw err;
            res.status(201).json({
              success: true,
              message: 'Registration successful. Please complete your profile.',
              token,
              user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profileComplete: false
              }
            });
          }
        );
      } catch (profileError) {
        console.error('Profile Creation Error:', profileError);
        // Clean up user if profile creation fails
        await User.findByIdAndDelete(user._id);
        throw profileError;
      }
    } catch (err) {
      console.error('Registration Error:', err);
      let errorMessage = 'Server error during registration';
      let statusCode = 500;

      if (err.code === 11000) {
        errorMessage = 'Email already exists';
        statusCode = 400;
      } else if (err.name === 'ValidationError') {
        errorMessage = Object.values(err.errors).map(val => val.message).join(', ');
        statusCode = 400;
      }

      res.status(statusCode).json({ 
        success: false,
        error: errorMessage 
      });
    }
  }
);

// @route   POST /api/auth/complete-society-profile
// @desc    Complete society profile
// @access  Private
router.post("/complete-society-profile", authMiddleware, async (req, res) => {
  try {
    const { name, address, phone, date_of_birth, gender, profile_picture } = req.body;
    const userId = req.user.id;

    if (!profile_picture) {
      return res.status(400).json({ success: false, message: "Profile picture is required" });
    }

    // ⬇️ Ubah base64 ke buffer
    const imageBuffer = Buffer.from(profile_picture, "base64");

    // ⬇️ Upload ke Vercel Blob
    const blob = await put(`profile_photos/${userId}.png`, imageBuffer, {
      access: "public",
      contentType: "image/png",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // blob.url berisi link publik ke gambar, misalnya:
    // https://your-app-name.public.blob.vercel-storage.com/profile_photos/xxxx.png

    // Simpan data ke MongoDB
    const updatedSociety = await Society.findOneAndUpdate(
      { userId },
      {
        name,
        address,
        phone,
        date_of_birth,
        gender,
        profile_picture: blob.url, // simpan URL gambar
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedSociety,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating profile",
      error: error.message,
    });
  }
});



// @route   POST /api/auth/complete-hrd-profile
// @desc    Complete HRD profile
// @access  Private
router.post(
  '/complete-hrd-profile',
  [
    auth,
    [
      check('name', 'Company name is required').not().isEmpty(),
      check('address', 'Address is required').not().isEmpty(),
      check('phone', 'Phone is required').not().isEmpty(),
      check('description','Description is required').not().isEmpty(),
      check('logo', 'logo isrequired').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    try {
      const { name, address, phone, description } = req.body;
      
      // Check if user is HRD
      if (req.user.role !== 'HRD') {
        return res.status(403).json({
          success: false,
          error: 'Only HRD can complete this profile'
        });
      }

      // Update company profile
      const company = await Company.findOneAndUpdate(
        { user: req.user.id },
        { 
          name,
          address,
          phone,
          description: description || '',
          isProfileComplete: true 
        },
        { new: true }
      );

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company profile not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'HRD profile completed successfully',
        profile: company
      });
    } catch (err) {
      console.error('Profile Completion Error:', err);
      res.status(500).json({
        success: false,
        error: 'Error completing profile'
      });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    try {
      // Check if user exists
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid credentials' 
        });
      }

      // Check password using the model's method
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return res.status(400).json({ 
          status: false,
          error: 'Wrong password' 
        });
      }

      // Get profile completion status
      let isProfileComplete = false;
      if (user.role === 'Society') {
        const society = await Society.findOne({ user: user._id });
        isProfileComplete = society?.isProfileComplete || false;
      } else if (user.role === 'HRD') {
        const company = await Company.findOne({ user: user._id });
        isProfileComplete = company?.isProfileComplete || false;
      }

      // Return jsonwebtoken
      const payload = {
        user: {
          id: user.id,
          role: user.role
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '7d' },
        (err, token) => {
          if (err) {
            console.error('JWT Error:', err);
            return res.status(500).json({
              success: false,
              error: 'Error generating token'
            });
          }
          
          res.status(200).json({
            success: true,
            token,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              isProfileComplete
            },
            message: isProfileComplete 
              ? 'Login successful' 
              : 'Please complete your profile'
          });
        }
      );
    } catch (err) {
      console.error('Login Error:', err);
      res.status(500).json({
        success: false,
        error: 'Server error during login'
      });
    }
  }
);

module.exports = router;
