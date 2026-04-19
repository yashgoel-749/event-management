# 🎪 Event Booking System (Backend)

A robust Event Booking System built with Node.js, Express, and MongoDB. Supports role-based access for Organizers and Customers, along with background job processing for notifications.

---

## 🛠️ Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **Authentication:** JWT (JSON Web Tokens)
- **Background Jobs:** EventEmitter-based Queue

---

## ⚙️ Prerequisites & Database Setup

### 1. Install MongoDB
You need MongoDB running on your local machine:
- **Windows:** Download and install [MongoDB Community Server](https://www.mongodb.com/try/download/community).
- **MongoDB Compass:** It's recommended to install [MongoDB Compass](https://www.mongodb.com/products/compass) (GUI) to view your data easily.

### 2. Verify MongoDB is Running
- Open your terminal and run: `mongosh` (or `mongo`).
- If it connects, the database is ready.
- The default connection string used in this project is: `mongodb://localhost:27017/event_booking`

---

## 🚀 Getting Started

1. **Go to the backend folder**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   # Development mode (with auto-restart)
   npm run dev

   # Production mode
   npm start
   ```

---

## 🧪 Step-by-Step Assignment Guide (Postman)

Follow these steps in order to demonstrate all the features required for the assignment.

### Phase 1: Authentication & Roles

#### 1. Register an Organizer
- **POST** `http://localhost:5000/api/auth/register`
- **Body:**
  ```json
  {
    "name": "Big Events Inc",
    "email": "organizer@test.com",
    "password": "password123",
    "role": "organizer"
  }
  ```
- **Goal:** Creates the "Event Organizer" user.

#### 2. Register a Customer
- **POST** `http://localhost:5000/api/auth/register`
- **Body:**
  ```json
  {
    "name": "Alice Customer",
    "email": "alice@test.com",
    "password": "password123",
    "role": "customer"
  }
  ```
- **Goal:** Creates the "Customer" user.

---

### Phase 2: Organizer Features

#### 3. Login as Organizer
- **POST** `http://localhost:5000/api/auth/login`
- **Body:** `{"email": "organizer@test.com", "password": "password123"}`
- **Action:** Copy the `token` from the response.

#### 4. Create an Event (Requires Token)
- **POST** `http://localhost:5000/api/events`
- **Auth:** Select "Bearer Token" and paste the Organizer's token.
- **Body:**
  ```json
   {
      "title": "Summer Music Festival",
      "description": "3 nights of amazing music",
      "date": "2026-07-15T18:00:00Z",
      "location": "Central Park",
      "ticketPrice": 200,
      "totalTickets": 50,
      "category": "music"
   }
  ```
- **Goal:** Only organizers can create events. Note the `_id` of the created event.
--69e47a586b5d09e538e15e47
---

### Phase 3: Customer Features & Background Task 1

#### 5. Login as Customer
- **POST** `http://localhost:5000/api/auth/login`
- **Body:** `{"email": "alice@test.com", "password": "password123"}`
- **Action:** Copy the `token` from the response.

#### 6. Browse Events (Public)
- **GET** `http://localhost:5000/api/events`
- **Goal:** Customers can see the list of available events.

#### 7. Book Tickets (Trigger Background Task 1)
- **POST** `http://localhost:5000/api/bookings`
- **Auth:** Select "Bearer Token" and paste the Customer's token.
- **Body:**
  ```json
  {
    "eventId": "REPLACE_WITH_EVENT_ID_FROM_STEP_4",
    "numberOfTickets": 2
  }
  ```
- **✨ Check Console:** You will see: `📧 BOOKING CONFIRMATION EMAIL... Confirmation email sent successfully!`

---

### Phase 4: Updates & Background Task 2

#### 8. Update Event (Trigger Background Task 2)
- **PUT** `http://localhost:5000/api/events/REPLACE_WITH_EVENT_ID_FROM_STEP_4`
- **Auth:** Use the **Organizer's** token.
- **Body:**
  ```json
  {
    "location": "Grand Arena (Venue Changed!)"
  }
  ```
- **✨ Check Console:** You will see: `🔔 EVENT UPDATE NOTIFICATION... Notification sent to: Alice Customer`. This notifies everyone who booked tickets for that event.

---

## 📁 Project Structure
```
backend/
├── config/       # Database configuration
├── jobs/         # Background job queue logic (EventEmitter)
├── middleware/   # Auth (Role checks) & Validation
├── models/       # Database Schemas
├── routes/       # API endpoints
└── server.js     # Entry point
```
