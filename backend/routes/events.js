const express = require('express');
const { body } = require('express-validator');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const jobQueue = require('../jobs/queue');

const router = express.Router();

// ─────────────────────────────────
// POST /api/events
// Create a new event (Organizer only)
// ─────────────────────────────────
router.post(
  '/',
  protect,
  authorize('organizer'),
  validate([
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('date').isISO8601().withMessage('Please provide a valid date'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('ticketPrice').isFloat({ min: 0 }).withMessage('Ticket price must be a non-negative number'),
    body('totalTickets').isInt({ min: 1 }).withMessage('Total tickets must be at least 1'),
    body('category')
      .optional()
      .isIn(['music', 'sports', 'technology', 'business', 'arts', 'food', 'other'])
      .withMessage('Invalid category'),
  ]),
  async (req, res) => {
    try {
      const eventData = {
        ...req.body,
        organizer: req.user._id,
      };

      const event = await Event.create(eventData);

      console.log(`🎉 New event created: "${event.title}" by ${req.user.name}`);

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        event,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create event',
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────
// GET /api/events
// Get all events (Public)
// ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // Support filtering by category, date, and search
    const query = {};

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const events = await Event.find(query)
      .populate('organizer', 'name email')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(query);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message,
    });
  }
});

// ─────────────────────────────────
// GET /api/events/:id
// Get single event by ID (Public)
// ─────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    res.status(200).json({ success: true, event });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: error.message,
    });
  }
});

// ─────────────────────────────────
// PUT /api/events/:id
// Update event (Organizer only - own events)
// Triggers background notification job
// ─────────────────────────────────
router.put(
  '/:id',
  protect,
  authorize('organizer'),
  async (req, res) => {
    try {
      let event = await Event.findById(req.params.id);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found',
        });
      }

      // Ensure organizer owns this event
      if (event.organizer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update this event',
        });
      }

      // Track which fields were updated
      const updatedFields = Object.keys(req.body).filter(
        (key) => req.body[key] !== undefined && key !== 'organizer'
      );

      // Prevent changing the organizer
      delete req.body.organizer;

      event = await Event.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      console.log(`📝 Event updated: "${event.title}" — fields: ${updatedFields.join(', ')}`);

      // ── BACKGROUND TASK 2: Notify booked customers ──
      const bookings = await Booking.find({
        event: event._id,
        status: 'confirmed',
      }).populate('customer', 'name email');

      if (bookings.length > 0) {
        const bookedCustomers = bookings.map((b) => ({
          name: b.customer.name,
          email: b.customer.email,
        }));

        jobQueue.addJob('event:update-notification', {
          eventId: event._id,
          eventTitle: event.title,
          updatedFields,
          bookedCustomers,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        event,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update event',
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────
// DELETE /api/events/:id
// Delete event (Organizer only - own events)
// ─────────────────────────────────
router.delete(
  '/:id',
  protect,
  authorize('organizer'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found',
        });
      }

      // Ensure organizer owns this event
      if (event.organizer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to delete this event',
        });
      }

      // Cancel all bookings for this event
      await Booking.updateMany(
        { event: event._id, status: 'confirmed' },
        { status: 'cancelled' }
      );

      await Event.findByIdAndDelete(req.params.id);

      console.log(`🗑️  Event deleted: "${event.title}"`);

      res.status(200).json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete event',
        error: error.message,
      });
    }
  }
);

module.exports = router;
