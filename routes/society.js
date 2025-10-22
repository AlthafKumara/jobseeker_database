const express = require('express');
const multer = require('multer');
const { auth, isSociety } = require('../middleware/auth');
const Society = require('../models/society.model');
const { uploadBufferToVercelBlob } = require('../utils/vercelBlob');
const Portfolio = require('../models/portfolio.model');
const Skill = require('../models/skill.model');

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



// ✅ POST Tambah Portfolio
router.post('/portfolio', auth, isSociety, upload.single('file'), async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const { skills, description } = req.body;

    // Validasi input
    if (!skills || !description || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Skills, description, and file are required'
      });
    }

    // Upload file ke Vercel Blob
    const buffer = req.file.buffer;
    const fileName = `${req.user.id}-portfolio-${Date.now()}-${req.file.originalname}`;
    const fileUrl = await uploadBufferToVercelBlob(buffer, fileName);

    // Konversi skills (bisa string CSV atau array JSON)
    let skillArray;
    try {
      skillArray = typeof skills === 'string' ? JSON.parse(skills) : skills;
      if (!Array.isArray(skillArray)) throw new Error();
    } catch {
      skillArray = skills.split(',').map(s => s.trim());
    }

    // Simpan ke database
    const newPortfolio = new Portfolio({
      skills: skillArray,
      description,
      file: fileUrl,
      society: society._id
    });

    await newPortfolio.save();

    res.status(201).json({
      success: true,
      message: 'Portfolio added successfully',
      data: newPortfolio
    });
  } catch (err) {
    console.error('❌ Error adding portfolio:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
});

// ✅ GET List Portfolio milik Society yang login
router.get('/portfolio', auth, isSociety, async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const portfolios = await Portfolio.find({ society: society._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: portfolios
    });
  } catch (err) {
    console.error('❌ Error getting portfolios:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
});

// ✅ PUT Update Portfolio
router.put('/portfolio/:id', auth, isSociety, upload.single('file'), async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      society: society._id
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }

    const { skills, description } = req.body;
    const updateFields = {};

    if (skills) {
      try {
        const parsedSkills = typeof skills === 'string' ? JSON.parse(skills) : skills;
        updateFields.skills = Array.isArray(parsedSkills)
          ? parsedSkills
          : skills.split(',').map(s => s.trim());
      } catch {
        updateFields.skills = skills.split(',').map(s => s.trim());
      }
    }

    if (description) updateFields.description = description;

    // Jika ada file baru, upload ke Vercel Blob
    if (req.file) {
      const buffer = req.file.buffer;
      const fileName = `${req.user.id}-portfolio-${Date.now()}-${req.file.originalname}`;
      const fileUrl = await uploadBufferToVercelBlob(buffer, fileName);
      updateFields.file = fileUrl;
    }

    const updatedPortfolio = await Portfolio.findByIdAndUpdate(
      portfolio._id,
      { $set: updateFields },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Portfolio updated successfully',
      data: updatedPortfolio
    });
  } catch (err) {
    console.error('❌ Error updating portfolio:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
});


// ✅ DELETE Hapus Portfolio
router.delete('/portfolio/:id', auth, isSociety, async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      society: society._id
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }

    await Portfolio.deleteOne({ _id: portfolio._id });

    res.json({
      success: true,
      message: 'Portfolio deleted successfully'
    });
  } catch (err) {
    console.error('❌ Error deleting portfolio:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
});




module.exports = router;
