const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth, isHRD } = require('../middleware/auth');
const Company = require('../models/company.model');
const User = require('../models/user.model');

const router = express.Router();

// @route   GET /api/companies/me
// @desc    Get current company profile
// @access  Private (HRD)
router.get('/me', auth,  isHRD, async (req, res) => {
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
  [auth, isHRD],
  async (req, res) => {
    try {
      const company = await Company.findOne({ user: req.user.id });
      if (!company) {
        return res.status(404).json({ msg: 'Company not found' });
      }

      // Ambil semua field dari request body
      const { name, address, phone, description, logo } = req.body;

      // Buat objek update hanya dari field yang dikirim
      const updateFields = {};
      if (name) updateFields.name = name;
      if (address) updateFields.address = address;
      if (phone) updateFields.phone = phone;
      if (description) updateFields.description = description;
      if (logo) {
        // Jika logo dikirim dalam base64 → upload ke Vercel Blob di sini
        const logoUrl = await uploadBase64ToVercelBlob(logo);
        updateFields.logo = logoUrl;
      }

      // Update hanya field yang dikirim
      const updatedCompany = await Company.findByIdAndUpdate(
        company._id,
        { $set: updateFields },
        { new: true }
      );

      return res.json({
        success: true,
        profile: updatedCompany,
        message: 'Company profile updated successfully',
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);


module.exports = router;
