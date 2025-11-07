const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth, isHRD, isSociety } = require('../middleware/auth');
const AvailablePosition = require('../models/availablePosition.model');
const PositionApplied = require('../models/positionApplied.model');
const Company = require('../models/company.model');
const Society = require('../models/society.model'); // <- tambahkan ini

const router = express.Router();

// @route   POST /api/positions
// @desc    Create a new position
// @access  Private (HRD)
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
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      position_name,
      capacity,
      description,
      submission_start_date,
      submission_end_date
    } = req.body;

    try {
      console.log('Request body:', req.body);
      
      const company = await Company.findOne({ user: req.user.id });
      if (!company) {
        console.log('Company not found for user:', req.user.id);
        return res.status(400).json({ 
          success: false,
          error: 'Company not found for this user' 
        });
      }

      // Convert dates to proper Date objects
      const startDate = new Date(submission_start_date);
      const endDate = new Date(submission_end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.log('Invalid date format');
        return res.status(400).json({ 
          success: false,
          error: 'Invalid date format. Please use ISO 8601 format (e.g., 2025-09-10T00:00:00.000Z)' 
        });
      }

      console.log('Creating new position with data:', {
        position_name,
        capacity: Number(capacity),
        description,
        submission_start_date: startDate,
        submission_end_date: endDate,
        company: company._id
      });

      const newPosition = new AvailablePosition({
        position_name,
        capacity: Number(capacity), // Ensure capacity is a number
        description,
        submission_start_date: startDate,
        submission_end_date: endDate,
        company: company._id
      });

      const position = await newPosition.save();
      console.log('Position created successfully:', position);
      
      res.status(201).json({
        success: true,
        data: position
      });
      
    } catch (err) {
      console.error('Error creating position:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      res.status(500).json({ 
        success: false,
        error: 'Server Error',
        message: err.message 
      });
    }
  }
);

// @route   GET /api/positions
// @desc    Get all available positions
// @access  Public
router.get('/', async (req, res) => {
  try {
    const currentDate = new Date();
    const positions = await AvailablePosition.find({
      
      submission_end_date: { $gte: new Date() },
      is_active: true
    })
      .populate('company', ['name', 'address'])
      .sort({ createdAt: -1 });

    res.json(positions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/positions/company
// @desc    Get all positions for current company
// @access  Private (HRD)
router.get('/company', auth, isHRD, async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user.id });
    if (!company) {
      return res.status(400).json({ msg: 'Company not found' });
    }

    const positions = await AvailablePosition.find({ company: company._id })
      .sort({ createdAt: -1 });

    res.json(positions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/positions/:id/apply
// @desc    Apply for a position
// @access  Private (Society)
router.post('/:id/apply', [auth, isSociety], async (req, res) => {
  try {
    const position = await AvailablePosition.findById(req.params.id);
    if (!position) {
      return res.status(404).json({ msg: 'Position not found' });
    }

    const currentDate = new Date();
    if (currentDate < position.submission_start_date || currentDate > position.submission_end_date) {
      return res.status(400).json({ msg: 'This position is not currently accepting applications' });
    }

    const society = await Society.findOne({ user: req.user.id }); 
    const existingApplication = await PositionApplied.findOne({
      available_position: req.params.id,
      society: society._id
    });

    if (existingApplication) {
      return res.status(400).json({ msg: 'You have already applied for this position' });
    }

    const newApplication = new PositionApplied({
      available_position: req.params.id,
      society: society._id,
      apply_date: new Date(),
      status: 'PENDING'
    });

    const application = await newApplication.save();
    await application.populate({
      path: 'available_position',
      populate: { path: 'company', model: 'Company', select: 'name' }
    });

    res.json(application);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Position not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/positions/applications/:id
// @desc    Update application status
// @access  Private (HRD)
router.put(
  '/applications/:id',
  [auth, isHRD, check('status', 'Status is required').isIn(['ACCEPTED', 'REJECTED'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const application = await PositionApplied.findById(req.params.id)
        .populate('available_position')
        .populate('society');

      if (!application) {
        return res.status(404).json({ msg: 'Application not found' });
      }

      const company = await Company.findOne({ user: req.user.id });
      if (application.available_position.company.toString() !== company._id.toString()) {
        return res.status(401).json({ msg: 'Not authorized' });
      }

      application.status = req.body.status;
      await application.save();

      res.json(application);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Application not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET /api/positions/:id/applications
// @desc    Get all applications for a position
// @access  Private (HRD)
router.get('/:id/applications', auth, isHRD, async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user.id });
    const position = await AvailablePosition.findOne({ _id: req.params.id, company: company._id });

    if (!position) {
      return res.status(404).json({ msg: 'Position not found' });
    }

    const applications = await PositionApplied.find({ available_position: req.params.id })
      .populate('society', ['name', 'email', 'phone'])
      .sort({ apply_date: -1 });

    res.json(applications);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Position not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
