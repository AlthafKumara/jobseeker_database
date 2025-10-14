const express = require('express');
const multer = require('multer');
const { auth, isHRD } = require('../middleware/auth');
const Company = require('../models/company.model');
const { uploadBufferToVercelBlob } = require('../utils/vercelBlob'); // fungsi upload ke blob (kita buat di bawah)

const router = express.Router();

// Konfigurasi multer (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Maksimum 10MB
});

// ✅ GET company profile (tidak perlu diubah)
router.get('/me', auth, isHRD, async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user.id });
    if (!company) {
      return res.status(400).json({ msg: 'No company profile found' });
    }
    res.json(company);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ✅ PUT company profile (upload logo pakai multer)
router.put('/me', auth, isHRD, upload.single('logo'), async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user.id });
    if (!company) {
      return res.status(404).json({ msg: 'Company not found' });
    }

    const { name, address, phone, description } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (address) updateFields.address = address;
    if (phone) updateFields.phone = phone;
    if (description) updateFields.description = description;

    if (req.file) {
      const buffer = req.file.buffer;
      const fileName = `${req.user.id}-${Date.now()}.png`;
      const logoUrl = await uploadBufferToVercelBlob(buffer, fileName);
      updateFields.logo = logoUrl;
    }

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
    console.error('❌ Error updating company:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
