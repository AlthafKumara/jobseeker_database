const express = require('express');
const { check, validationResult } = require('express-validator');
const Skill = require('../models/skill.model');

const router = express.Router();

/**
 * @route   POST /api/skills
 * @desc    Create a new skill
 * @access  Public
 */
router.post(
  '/',
  [
    check('name', 'Skill name is required').not().isEmpty().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name } = req.body;
      
      // Check if skill already exists (case insensitive)
      const existingSkill = await Skill.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') } 
      });
      
      if (existingSkill) {
        return res.status(400).json({ 
          success: false,
          error: 'This skill already exists' 
        });
      }

      const skill = new Skill({ name });
      await skill.save();
      
      res.status(201).json({
        success: true,
        data: skill
      });
      
    } catch (err) {
      console.error('Error creating skill:', err);
      res.status(500).json({ 
        success: false,
        error: 'Server Error',
        message: err.message 
      });
    }
  }
);

/**
 * @route   GET /api/skills
 * @desc    Get all skills
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const skills = await Skill.find(query)
      .sort({ name: 1 })
      .select('name');
    
    res.json({
      success: true,
      data: skills
    });
    
  } catch (err) {
    console.error('Error getting skills:', err);
    res.status(500).json({ 
      success: false,
      error: 'Server Error',
      message: err.message 
    });
  }
});

module.exports = router;
