const express = require('express');
const multer = require('multer');
const { auth, isHRD } = require('../middleware/auth');
const Company = require('../models/company.model');
const { uploadBufferToVercelBlob, deleteFromVercelBlob } = require('../utils/vercelBlob');

const router = express.Router();

// Konfigurasi multer (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Maks 10MB
});

// ✅ GET company profile
router.get('/me', auth, isHRD, async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user.id });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company profile not found' });
    }
    res.json({ success: true, data: company });
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ✅ PUT Update Company Profile (upload logo)
router.put('/me', auth, isHRD, upload.single('logo'), async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user.id });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const { name, address, phone, description } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (address) updateFields.address = address;
    if (phone) updateFields.phone = phone;
    if (description) updateFields.description = description;

    if (req.file) {
      // 🧹 Hapus logo lama kalau ada
      if (company.logo) {
        await deleteFromVercelBlob(company.logo);
      }

      const buffer = req.file.buffer;
      const fileName = req.file.originalname;
      const logoUrl = await uploadBufferToVercelBlob(buffer, fileName, req.file.mimetype);
      updateFields.logo = logoUrl;
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      company._id,
      { $set: updateFields },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Company profile updated successfully',
      data: updatedCompany,
    });
  } catch (err) {
    console.error('❌ Error updating company:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
