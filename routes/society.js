const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth, isSociety } = require('../middleware/auth');
const Society = require('../models/society.model');
const Portfolio = require('../models/portfolio.model');
const PositionApplied = require('../models/positionApplied.model');

const router = express.Router();

// @route   GET /api/societies/me
// @desc    Get current society profile
// @access  Private (Society)
router.get('/me', auth, isSociety, async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    
    if (!society) {
      return res.status(400).json({ msg: 'There is no profile for this user' });
    }

    res.json(society);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/societies/me
// @desc    Update society profile
// @access  Private (Society)
router.put(
  '/me',
  [
    auth,
    isSociety,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('address', 'Address is required').not().isEmpty(),
      check('phone', 'Phone number is required').not().isEmpty(),
      check('date_of_birth', 'Date of birth is required').not().isEmpty(),
      check('gender', 'Gender is required').isIn(['Male', 'Female']),
      check('profile_photo', 'Profile photo is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, phone, date_of_birth, gender, profile_photo } = req.body;

    try {
      let society = await Society.findOne({ user: req.user.id });

      if (!society) {
        return res.status(400).json({ msg: 'Society not found' });
      }

      // Update society
      // Build update object with only provided fields
      const updateFields = {};
      if (name) updateFields.name = name;
      if (address) updateFields.address = address;
      if (phone) updateFields.phone = phone;
      if (date_of_birth) updateFields.date_of_birth = date_of_birth;
      if (gender) updateFields.gender = gender;
      if (profile_photo !== undefined) updateFields.profile_photo = profile_photo;

      society = await Society.findByIdAndUpdate(
        society._id,
        { $set: updateFields },
        { new: true }
      );

      res.json(society);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST /api/societies/me/portfolio
// @desc    Add portfolio item
// @access  Private (Society)
router.post(
  '/me/portfolio',
  [
    auth,
    isSociety,
    [
      check('skills', 'At least one skill is required').isArray({ min: 1 }),
      check('description', 'Description is required').not().isEmpty(),
      check('file', 'File is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const society = await Society.findOne({ user: req.user.id });
      
      const newPortfolio = new Portfolio({
        skills: req.body.skills,
        description: req.body.description,
        file: req.body.file,
        society: society._id
      });

      const portfolio = await newPortfolio.save();
      res.json(portfolio);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET /api/societies/me/applications
// @desc    Get all applications for current society
// @access  Private (Society)
router.get('/me/applications', auth, isSociety, async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    const applications = await PositionApplied.find({ society: society._id })
      .populate('available_position', ['position_name', 'company'])
      .populate({
        path: 'available_position',
        populate: {
          path: 'company',
          model: 'Company',
          select: 'name'
        }
      });

    res.json(applications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
