const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an event title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide an event description'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Please provide an event date'],
    },
    location: {
      type: String,
      required: [true, 'Please provide an event location'],
      trim: true,
    },
    ticketPrice: {
      type: Number,
      required: [true, 'Please provide a ticket price'],
      min: [0, 'Ticket price cannot be negative'],
    },
    totalTickets: {
      type: Number,
      required: [true, 'Please provide total ticket count'],
      min: [1, 'Must have at least 1 ticket'],
    },
    availableTickets: {
      type: Number,
      min: [0, 'Available tickets cannot be negative'],
    },
    category: {
      type: String,
      enum: ['music', 'sports', 'technology', 'business', 'arts', 'food', 'other'],
      default: 'other',
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Set availableTickets to totalTickets on creation
eventSchema.pre('save', function () {
  if (this.isNew) {
    this.availableTickets = this.totalTickets;
  }
});

module.exports = mongoose.model('Event', eventSchema);
