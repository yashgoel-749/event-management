const express = require('express');
const { body } = require('express-validator');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const jobQueue = require('../jobs/queue');

const router = express.Router();

// ─────────────────────────────────
// POST /api/bookings
// Book tickets for an event (Customer only)
// Triggers background confirmation job
// ─────────────────────────────────
router.post(
  '/',
  protect,
  authorize('customer'),
  validate([
    body('eventId').notEmpty().withMessage('Event ID is required'),
    body('numberOfTickets')
      .isInt({ min: 1 })
      .withMessage('Must book at least 1 ticket'),
  ]),
  async (req, res) => {
    try {
      const { eventId, numberOfTickets } = req.body;

      // Find the event
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found',
        });
      }

      // Check if event date has passed
      if (new Date(event.date) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot book tickets for a past event',
        });
      }

      // Check ticket availability
      if (event.availableTickets < numberOfTickets) {
        return res.status(400).json({
          success: false,
          message: `Only ${event.availableTickets} ticket(s) available`,
        });
      }

      // Calculate total amount
      const totalAmount = event.ticketPrice * numberOfTickets;

      // Create booking
      const booking = await Booking.create({
        event: event._id,
        customer: req.user._id,
        numberOfTickets,
        totalAmount,
      });

      // Reduce available tickets
      event.availableTickets -= numberOfTickets;
      await event.save();

      console.log(
        `🎫 Booking created: ${req.user.name} booked ${numberOfTickets} ticket(s) for "${event.title}"`
      );

      // ── BACKGROUND TASK 1: Send booking confirmation ──
      jobQueue.addJob('booking:confirmation', {
        bookingId: booking._id,
        customerName: req.user.name,
        customerEmail: req.user.email,
        eventTitle: event.title,
        eventDate: event.date,
        eventLocation: event.location,
        numberOfTickets,
        totalAmount,
      });

      res.status(201).json({
        success: true,
        message: 'Tickets booked successfully',
        booking: {
          id: booking._id,
          event: {
            id: event._id,
            title: event.title,
            date: event.date,
            location: event.location,
          },
          numberOfTickets,
          totalAmount,
          status: booking.status,
          bookedAt: booking.createdAt,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────
// GET /api/bookings
// Get all bookings for logged in customer
// ─────────────────────────────────
router.get('/', protect, authorize('customer'), async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate({
        path: 'event',
        select: 'title date location ticketPrice category',
        populate: { path: 'organizer', select: 'name email' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message,
    });
  }
});

// ─────────────────────────────────
// GET /api/bookings/:id
// Get single booking details (Customer only - own bookings)
// ─────────────────────────────────
router.get('/:id', protect, authorize('customer'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'event',
        select: 'title description date location ticketPrice category',
        populate: { path: 'organizer', select: 'name email' },
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Ensure customer owns this booking
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking',
      });
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: error.message,
    });
  }
});

// ─────────────────────────────────
// PATCH /api/bookings/:id/cancel
// Cancel a booking (Customer only - own bookings)
// ─────────────────────────────────
router.patch('/:id/cancel', protect, authorize('customer'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Ensure customer owns this booking
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking',
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled',
      });
    }

    // Cancel the booking
    booking.status = 'cancelled';
    await booking.save();

    // Restore available tickets
    const event = await Event.findById(booking.event);
    if (event) {
      event.availableTickets += booking.numberOfTickets;
      await event.save();
    }

    console.log(`❌ Booking cancelled: ${req.user.name} cancelled booking ${booking._id}`);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message,
    });
  }
});

// ─────────────────────────────────
// GET /api/bookings/event/:eventId
// Get all bookings for a specific event (Organizer only)
// ─────────────────────────────────
router.get('/event/:eventId', protect, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

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
        message: 'Not authorized to view bookings for this event',
      });
    }

    const bookings = await Booking.find({ event: event._id })
      .populate('customer', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      event: { id: event._id, title: event.title },
      bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event bookings',
      error: error.message,
    });
  }
});

module.exports = router;
