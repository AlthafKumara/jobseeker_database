const express = require('express');
const multer = require('multer');
const { auth, isSociety } = require('../middleware/auth');
const Society = require('../models/society.model');
const { uploadBufferToVercelBlob } = require('../utils/vercelBlob');

const router = express.Router();

// Konfigurasi multer (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // max 10MB
});

// ✅ GET Profile (tidak diubah)
router.get('/me', auth, isSociety, async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    if (!society) {
      return res.status(404).json({ msg: 'Society profile not found' });
    }
    res.json(society);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ✅ PUT Update Profile (pakai multer untuk upload foto)
router.put('/me', auth, isSociety, upload.single('profile_photo'), async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    if (!society) {
      return res.status(404).json({ msg: 'Society not found' });
    }

    const { name, address, phone, date_of_birth, gender } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (address) updateFields.address = address;
    if (phone) updateFields.phone = phone;
    if (date_of_birth) updateFields.date_of_birth = date_of_birth;
    if (gender) updateFields.gender = gender;

    if (req.file) {
      const buffer = req.file.buffer;
      const fileName = `${req.user.id}-${Date.now()}.png`;
      const photoUrl = await uploadBufferToVercelBlob(buffer, fileName);
      updateFields.profile_photo = photoUrl;
    }

    const updatedSociety = await Society.findByIdAndUpdate(
      society._id,
      { $set: updateFields },
      { new: true }
    );

    return res.json({
      success: true,
      profile: updatedSociety,
      message: 'Society profile updated successfully',
    });
  } catch (err) {
    console.error('❌ Error updating society:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
