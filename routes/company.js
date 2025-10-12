const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth, isHRD } = require('../middleware/auth');
const Company = require('../models/company.model');
const User = require('../models/user.model');

const router = express.Router();

// @route   GET /api/companies/me
// @desc    Get current company profile
// @access  Private (HRD)
router.get('/me', auth, isHRD, async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user.id });
    
    if (!company) {
      return res.status(400).json({ msg: 'There is no profile for this user' });
    }

    res.json(company);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/companies/me
// @desc    Update company profile
// @access  Private (HRD)
router.put(
  '/me',
  [
    auth,
    isHRD,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('address', 'Address is required').not().isEmpty(),
      check('phone', 'Phone number is required').not().isEmpty(),
      check('description','Description is required').not().isEmpty(),
      check('logo', 'Logo is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, phone, description } = req.body;

    try {
      let company = await Company.findOne({ user: req.user.id });

      if (!company) {
        return res.status(400).json({ msg: 'Company not found' });
      }

      // Update company
      company = await Company.findByIdAndUpdate(
        company._id,
        { $set: { name, address, phone, description } },
        { new: true }
      );

      res.json(company);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router;
