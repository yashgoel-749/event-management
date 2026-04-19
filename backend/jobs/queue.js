const EventEmitter = require('events');

class JobQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = false;

    console.log('🚀 Background Job Queue initialized');
  }

  /**
   * Add a job to the queue
   * @param {string} jobName - Name/type of the job
   * @param {object} data - Job payload
   */
  addJob(jobName, data) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: jobName,
      data,
      createdAt: new Date(),
      status: 'pending',
    };

    this.queue.push(job);
    console.log(`\n📥 [QUEUE] Job added: ${jobName} (ID: ${job.id})`);

    // Process immediately (async)
    this._processQueue();

    return job;
  }

  /**
   * Process jobs in the queue one at a time
   */
  async _processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      job.status = 'processing';

      console.log(`\n⚙️  [QUEUE] Processing job: ${job.name} (ID: ${job.id})`);

      try {
        // Simulate async processing delay (like sending an email would take)
        await this._delay(1500);

        // Emit the job event for handlers
        this.emit(job.name, job.data);

        job.status = 'completed';
        console.log(`✅ [QUEUE] Job completed: ${job.name} (ID: ${job.id})`);
      } catch (error) {
        job.status = 'failed';
        console.error(`❌ [QUEUE] Job failed: ${job.name} (ID: ${job.id})`, error.message);
      }
    }

    this.processing = false;
  }

  /**
   * Simulate async delay
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Create a singleton instance
const jobQueue = new JobQueue();

// ──────────────────────────────────────────────
// BACKGROUND TASK 1: Booking Confirmation Email
// ──────────────────────────────────────────────
jobQueue.on('booking:confirmation', (data) => {
  console.log('\n' + '═'.repeat(60));
  console.log('📧 BOOKING CONFIRMATION EMAIL');
  console.log('═'.repeat(60));
  console.log(`  To:       ${data.customerEmail}`);
  console.log(`  Name:     ${data.customerName}`);
  console.log(`  Event:    ${data.eventTitle}`);
  console.log(`  Date:     ${data.eventDate}`);
  console.log(`  Location: ${data.eventLocation}`);
  console.log(`  Tickets:  ${data.numberOfTickets}`);
  console.log(`  Total:    ₹${data.totalAmount}`);
  console.log(`  Booking:  ${data.bookingId}`);
  console.log('─'.repeat(60));
  console.log('  ✉️  Confirmation email sent successfully!');
  console.log('═'.repeat(60) + '\n');
});

// ──────────────────────────────────────────────
// BACKGROUND TASK 2: Event Update Notification
// ──────────────────────────────────────────────
jobQueue.on('event:update-notification', (data) => {
  console.log('\n' + '═'.repeat(60));
  console.log('🔔 EVENT UPDATE NOTIFICATION');
  console.log('═'.repeat(60));
  console.log(`  Event:     ${data.eventTitle}`);
  console.log(`  Updated:   ${data.updatedFields.join(', ')}`);
  console.log(`  Notifying: ${data.bookedCustomers.length} customer(s)`);
  console.log('─'.repeat(60));

  data.bookedCustomers.forEach((customer, index) => {
    console.log(`  📩 [${index + 1}] Notification sent to: ${customer.name} (${customer.email})`);
  });

  console.log('─'.repeat(60));
  console.log('  🔔 All customers notified about the event update!');
  console.log('═'.repeat(60) + '\n');
});

module.exports = jobQueue;
