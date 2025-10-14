const express = require('express');
const { check, validationResult } = require('express-validator');
const Skill = require('../models/skill.model');

const router = express.Router();

/**
 * @route   POST /api/skills
 * @desc    Create one or multiple skills
 * @access  Public
 */
router.post(
  '/',
  [
    check('skills', 'Skills data is required').isArray({ min: 1 }),
    check('skills.*.name', 'Each skill must have a valid name')
      .not()
      .isEmpty()
      .trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { skills } = req.body; // Expects { "skills": [ { "name": "JavaScript" }, { "name": "Python" } ] }

      const results = [];
      const duplicates = [];

      for (const s of skills) {
        const name = s.name.trim();

        // Check if skill already exists (case insensitive)
        const existingSkill = await Skill.findOne({
          name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingSkill) {
          duplicates.push(name);
          continue;
        }

        const newSkill = new Skill({ name });
        await newSkill.save();
        results.push(newSkill);
      }

      res.status(201).json({
        success: true,
        inserted: results.length,
        skipped: duplicates.length,
        duplicates,
        data: results
      });
    } catch (err) {
      console.error('Error creating skills:', err);
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
