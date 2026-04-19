const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');

// Initialize express app
const app = express();

// ── Body parser middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logger (dev) ──
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

// ── Health check ──
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🎪 Event Booking System API is running',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
      },
      events: {
        list: 'GET /api/events',
        single: 'GET /api/events/:id',
        create: 'POST /api/events (organizer)',
        update: 'PUT /api/events/:id (organizer)',
        delete: 'DELETE /api/events/:id (organizer)',
      },
      bookings: {
        create: 'POST /api/bookings (customer)',
        myBookings: 'GET /api/bookings (customer)',
        single: 'GET /api/bookings/:id (customer)',
        cancel: 'PATCH /api/bookings/:id/cancel (customer)',
        eventBookings: 'GET /api/bookings/event/:eventId (organizer)',
      },
    },
  });
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('💥 Unhandled Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
  });
});

// ── Start server ──
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log('\n' + '═'.repeat(50));
    console.log(`🎪 Event Booking System API`);
    console.log(`🌐 Server running on: http://localhost:${PORT}`);
    console.log(`📅 Started at: ${new Date().toLocaleString()}`);
    console.log('═'.repeat(50) + '\n');
  });
});

module.exports = app;
