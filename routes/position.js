const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth, isHRD, isSociety } = require('../middleware/auth');
const AvailablePosition = require('../models/availablePosition.model');
const PositionApplied = require('../models/positionApplied.model');
const Company = require('../models/company.model');
const Society = require('../models/society.model'); 
const Portfolio = require('../models/portfolio.model');

const router = express.Router();

/* ======================================================
   🟢 CREATE NEW POSITION (HRD)
====================================================== */
router.post(
  '/',
  [
    auth,
    isHRD,
    [
      check('position_name', 'Position name is required').not().isEmpty(),
      check('capacity', 'Capacity is required').isNumeric(),
      check('description', 'Description is required').not().isEmpty(),
      check('submission_start_date', 'Start date is required').isISO8601(),
      check('submission_end_date', 'End date is required').isISO8601()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { position_name, capacity, description, submission_start_date, submission_end_date } = req.body;

    try {
      const company = await Company.findOne({ user: req.user.id });
      if (!company) {
        return res.status(400).json({ success: false, error: 'Company not found for this user' });
      }

      const startDate = new Date(submission_start_date);
      const endDate = new Date(submission_end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Please use ISO 8601 format (e.g., 2025-09-10T00:00:00.000Z)'
        });
      }

      const newPosition = new AvailablePosition({
        position_name,
        capacity: Number(capacity),
        description,
        submission_start_date: startDate,
        submission_end_date: endDate,
        company: company._id
      });

      const position = await newPosition.save();
      res.status(201).json({ success: true, data: position });
    } catch (err) {
      console.error('Error creating position:', err);
      res.status(500).json({ success: false, error: 'Server Error', message: err.message });
    }
  }
);

/* ======================================================
   🔵 GET ALL ACTIVE POSITIONS (PUBLIC)
====================================================== */
router.get('/', async (req, res) => {
  try {
    const positions = await AvailablePosition.find({
      submission_end_date: { $gte: new Date() },
      is_active: true
    })
      .populate('company', ['name', 'address', 'logo'])
      .sort({ createdAt: -1 });

    res.json(positions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/* ======================================================
   🟣 GET POSITIONS BY CURRENT COMPANY (HRD)
====================================================== */
router.get('/company', auth, isHRD, async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user.id });
    if (!company) return res.status(400).json({ msg: 'Company not found' });

    const positions = await AvailablePosition.find({ company: company._id }).sort({ createdAt: -1 });
    res.json(positions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/* ======================================================
   🟤 APPLY FOR A POSITION (SOCIETY)
====================================================== */
router.post('/:id/apply', [auth, isSociety], async (req, res) => {
  try {
    const position = await AvailablePosition.findById(req.params.id);
    if (!position) return res.status(404).json({ msg: 'Position not found' });

    const society = await Society.findOne({ user: req.user.id });
    if (!society) return res.status(404).json({ msg: 'Society not found' });

    const existingApplication = await PositionApplied.findOne({
      available_position: req.params.id,
      society: society._id,
    });
    if (existingApplication)
      return res.status(400).json({ msg: 'You have already applied for this position' });

    const portfolio = await Portfolio.findOne({ society: society._id });
    if (!portfolio)
      return res.status(400).json({ msg: 'Please create your portfolio before applying' });

    const { cover_letter } = req.body;

    const newApplication = new PositionApplied({
      available_position: req.params.id,
      society: society._id,
      portfolio: portfolio._id,
      apply_date: new Date(),
      status: 'PENDING',
      cover_letter,
    });

    await newApplication.save();
    res.json({ msg: 'Application submitted successfully', data: newApplication });
  } catch (err) {
    console.error('❌ Error in apply route:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

/* ======================================================
   🟡 UPDATE APPLICATION STATUS (HRD)
====================================================== */
router.put(
  '/applications/:id',
  [auth, isHRD, check('status', 'Status is required').isIn(['ACCEPTED', 'REJECTED'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const application = await PositionApplied.findById(req.params.id)
        .populate('available_position')
        .populate('society');
      if (!application) return res.status(404).json({ msg: 'Application not found' });

      const company = await Company.findOne({ user: req.user.id });
      if (application.available_position.company.toString() !== company._id.toString()) {
        return res.status(401).json({ msg: 'Not authorized' });
      }

      application.status = req.body.status;
      if (req.body.message) application.message = req.body.message;
      await application.save();

      res.json(application);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

/* ======================================================
   🟢 GET ALL APPLICATIONS FOR CURRENT COMPANY (HRD)
====================================================== */
router.get('/company/applications', auth, isHRD, async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user.id });
    if (!company) return res.status(404).json({ msg: 'Company not found' });

    const positions = await AvailablePosition.find({ company: company._id });
    const positionIds = positions.map(pos => pos._id);

    const applications = await PositionApplied.find({
      available_position: { $in: positionIds }
    })
      .populate({
        path: 'available_position',
        populate: {
          path: 'company',
          model: 'Company',
          select: 'name address logo'
        }
      })
      .populate('society', ['name', 'email', 'phone', 'profile_picture'])
      .populate('portfolio', ['description', 'skills', 'file'])
      .sort({ apply_date: -1 });

    res.json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (err) {
    console.error('❌ Error fetching all applicants:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

/* ======================================================
   🔴 GET APPLICATIONS BY POSITION ID (HRD)
====================================================== */
router.get('/:id/applications', auth, isHRD, async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user.id });
    const position = await AvailablePosition.findOne({ _id: req.params.id, company: company._id });
    if (!position) return res.status(404).json({ msg: 'Position not found' });

    const applications = await PositionApplied.find({ available_position: req.params.id })
      .populate('society', ['name', 'email', 'phone'])
      .populate('portfolio', ['description', 'skills', 'file'])
      .sort({ apply_date: -1 });

    res.json(applications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/* ======================================================
   🧑‍💼 GET MY APPLICATIONS (SOCIETY)
====================================================== */
router.get('/my-applications', auth, isSociety, async (req, res) => {
  try {
    const society = await Society.findOne({ user: req.user.id });
    if (!society) return res.status(404).json({ msg: 'Society not found' });

    const applications = await PositionApplied.find({ society: society._id })
      .populate({
        path: 'available_position',
        populate: {
          path: 'company',
          model: 'Company',
          select: 'name address logo'
        }
      })
      .sort({ apply_date: -1 });

    res.json(applications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
