const express = require('express');
const multer = require('multer');
const { auth, isSociety } = require('../middleware/auth');
const Society = require('../models/society.model');
const Portfolio = require('../models/portfolio.model');
const { uploadBufferToVercelBlob, deleteFromVercelBlob } = require('../utils/vercelBlob');

const router = express.Router();

// Konfigurasi multer (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Maks 10MB
});

// ✅ GET Society Profile
router.get('/me', auth, isSociety, async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society profile not found' });
    }
    res.json({ success: true, data: society });
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ✅ PUT Update Society Profile (foto profil)
router.put('/me', auth, isSociety, upload.single('profile_photo'), async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const { name, address, phone, date_of_birth, gender } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (address) updateFields.address = address;
    if (phone) updateFields.phone = phone;
    if (date_of_birth) updateFields.date_of_birth = date_of_birth;
    if (gender) updateFields.gender = gender;

    if (req.file) {
      // 🧹 Hapus foto lama kalau ada
      if (society.profile_photo) {
        await deleteFromVercelBlob(society.profile_photo);
      }

      const buffer = req.file.buffer;
      const fileName = req.file.originalname;
      const photoUrl = await uploadBufferToVercelBlob(buffer, fileName, req.file.mimetype);
      updateFields.profile_photo = photoUrl;
    }

    const updatedSociety = await Society.findByIdAndUpdate(
      society._id,
      { $set: updateFields },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Society profile updated successfully',
      data: updatedSociety,
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
    let fileUrl;

    // ✅ Upload file kalau ada
    if (req.file) {
      const buffer = req.file.buffer;
      const fileName = req.file.originalname;
      fileUrl = await uploadBufferToVercelBlob(buffer, fileName, req.file.mimetype);
    }

    // ✅ Parse skills
    let skillArray = [];
    if (skills) {
      try {
        skillArray = typeof skills === 'string' ? JSON.parse(skills) : skills;
        if (!Array.isArray(skillArray)) throw new Error();
      } catch {
        skillArray = skills.split(',').map(s => s.trim());
      }
    }

    // ✅ Validasi minimal
    if (!skills && !description && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'At least one of skills, description, or file is required',
      });
    }

    // ✅ Simpan portfolio
    const newPortfolio = new Portfolio({
      skills: skillArray || [],
      description: description || '',
      file: fileUrl || '',
      society: society._id,
    });

    await newPortfolio.save();

    res.status(201).json({
      success: true,
      message: 'Portfolio added successfully',
      data: newPortfolio,
    });
  } catch (err) {
    console.error('❌ Error adding portfolio:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ✅ GET Semua Portfolio
router.get('/portfolio', auth, isSociety, async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const portfolios = await Portfolio.find({ society: society._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: portfolios.map(p => ({
        _id: p._id,
        description: p.description,
        skills: p.skills,
        file: p.file,
        fileName: p.file ? p.file.split('/').pop() : null, // hanya nama file
      })),
    });
  } catch (err) {
    console.error('❌ Error getting portfolios:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ✅ PUT Update Portfolio
router.put('/portfolio/:id', auth, isSociety, upload.single('file'), async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const portfolio = await Portfolio.findOne({ _id: req.params.id, society: society._id });
    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Portfolio not found' });
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

    if (req.file) {
      // 🧹 Hapus file lama
      if (portfolio.file) {
        await deleteFromVercelBlob(portfolio.file);
      }

      const buffer = req.file.buffer;
      const fileName = req.file.originalname;
      const fileUrl = await uploadBufferToVercelBlob(buffer, fileName, req.file.mimetype);
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
      data: updatedPortfolio,
    });
  } catch (err) {
    console.error('❌ Error updating portfolio:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ✅ DELETE Hapus Portfolio
router.delete('/portfolio/:id', auth, isSociety, async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const portfolio = await Portfolio.findOne({ _id: req.params.id, society: society._id });
    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Portfolio not found' });
    }

    // 🧹 Hapus file dari blob
    if (portfolio.file) {
      await deleteFromVercelBlob(portfolio.file);
    }

    await Portfolio.deleteOne({ _id: portfolio._id });

    res.json({ success: true, message: 'Portfolio deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting portfolio:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
