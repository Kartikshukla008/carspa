# Lustre AutoSpa — Doorstep Car Washing Booking Platform

A complete, production-ready full-stack platform for an at-home car washing business. Customers can browse packages, view dynamic pricing for their vehicle type, check real-time time slot availability via our smart scheduling engine, submit booking requests, and track their appointment status in real-time.

Administrators have access to a secure, database-backed management portal featuring real-time KPIs, booking lifecycle workflows (confirm, assign staff, reschedule, cancel), lead capture CRM, technician roster management, and capacity configuration.

---

## 1. Technology Stack

- **Frontend**: Next.js 14 (App Router) with TypeScript, Tailwind CSS, and Lucide icons.
- **Backend**: Python 3.10+, Django 5.1, and Django REST Framework.
- **Database**: PostgreSQL (with automatic SQLite fallback for local test runs without external services).
- **Scheduling & Concurrency**: Custom Availability Engine with atomic transactions (`select_for_update`), overlap calculation, buffer times, and staff capacity tracking.
- **API Documentation**: OpenAPI / Swagger interactive documentation via `drf-spectacular` (`/api/docs/`).
- **Deployment**: Multi-container Docker & Docker Compose (`db`, `backend`, `frontend`).

---

## 2. Key Features

### A. Customer Experience & Public Flow
- **Homepage (`/`)**:
  - Hero section: *"Premium Car Wash at Your Doorstep"* with primary CTA *"Book a Car Wash"*.
  - Dynamic vehicle type toggle (Hatchback, Sedan, SUV/MUV, Luxury 7-Seater) previewing exact prices from the database.
  - "How It Works" 4-step walkthrough.
  - Service benefits, coverage hubs (Bengaluru), customer reviews, and FAQ.
- **Services & Pricing (`/services`)**:
  - Full catalog of packages: *Express Foam Exterior*, *Standard Interior & Exterior*, *Premium Carnauba Wax Spa*, *Interior Deep Sanitization*, and *Platinum Ceramic Booster*.
  - Live vehicle pricing matrix and feature checklists.
  - Pre-selected package routing directly into the booking flow.
- **Multi-Step Booking Flow (`/book`)**:
  - Step 1: Vehicle selection.
  - Step 2: Service package selection.
  - Step 3: Date picker & real-time slot selection (retrieved from backend engine with status, remaining capacity, and reasons).
  - Step 4: Contact details & doorstep address (automatically captures prospective leads).
  - Step 5: Price breakdown and review.
  - Step 6: Instant confirmation with unique human-friendly Booking Reference (`CW-YYYYMMDD-XXXX`), direct WhatsApp support button, and calendar integration.
- **Booking Status Tracker (`/track`)**:
  - Customers can enter their reference (e.g. `CW-DEMO-001`) to inspect real-time status (Pending, Confirmed, Assigned Technician, In Progress, Completed, Cancelled).

### B. Smart Scheduling & Availability Engine
- Calculates availability for any given date, package, vehicle type, and locality.
- Enforces:
  - Business operating hours (default 08:00 AM – 08:00 PM).
  - Service-specific duration (45 mins to 180 mins).
  - Turnaround buffer time (default 30 mins).
  - Minimum advance booking notice (default 2 hours).
  - Max booking window (default 14 days ahead).
  - Active staff working schedules and coverage areas.
  - Slot blackout dates/maintenance periods (`SlotBlockout`).
- **Concurrency & Double-Booking Prevention**:
  - Atomic database transactions with validation before booking creation.
  - Correctly accounts for both assigned technicians and unassigned pending bookings so concurrent users cannot exceed staff capacity.

### C. Lead Capture & CRM
- Automatically captures booking attempts as leads (`Lead` model).
- Status lifecycle: `NEW` ➔ `CONTACTED` ➔ `INTERESTED` ➔ `BOOKING_PENDING` ➔ `CONVERTED` ➔ `LOST`.
- Tracks source: Website, Booking Flow, WhatsApp, Campaign, Referral.
- Admin notes and follow-up logging.
- One-click CSV export.

### D. Secure Admin Dashboard (`/admin-portal`)
- Authenticated via secure session credentials (Default: `admin` / `admin123`).
- **Overview Metrics**: Total bookings, today's appointments, pending confirmations, completed jobs, gross revenue, and conversion rate.
- **Booking Management**: Search, filter by status, confirm requests, assign technicians, reschedule, cancel with audit reason, and export CSV.
- **Staff & Technician Management**: Daily job quotas, active assignments, and area hubs.
- **Scheduling Config**: Toggle auto-confirmation, adjust operating hours, buffers, and advance notice.

---

## 3. Project Structure

```
├── backend/
│   ├── apps/
│   │   ├── core/           # Business config, audit logging, seed command
│   │   ├── services/       # VehicleType, ServicePackage, ServicePackagePrice, ServiceArea
│   │   ├── scheduling/     # AvailabilityEngine, SlotBlockout
│   │   ├── staff/          # StaffProfile, StaffWorkingSchedule, StaffServiceArea
│   │   ├── crm/            # Lead model, lead lifecycle endpoints
│   │   ├── bookings/       # Booking, Customer, StatusHistory, Assignment, tests
│   │   ├── notifications/  # WhatsApp Cloud API, Email, SMS multi-provider dispatcher
│   │   └── payments/       # Razorpay client & signature verification
│   ├── config/             # Django settings, root URLs, OpenAPI setup
│   ├── Dockerfile
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Homepage
│   │   │   ├── services/page.tsx # Services & Pricing
│   │   │   ├── book/page.tsx     # Multi-step booking engine
│   │   │   ├── track/page.tsx    # Customer booking status lookup
│   │   │   ├── admin-portal/     # Protected admin dashboard
│   │   │   └── layout.tsx
│   │   ├── components/     # Navbar, Footer
│   │   ├── lib/            # Typed API client
│   │   └── types/          # TypeScript interfaces
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 4. Quick Start Guide

### Option A: Running with Docker Compose (Recommended for Production)

1. Clone or navigate to the repository:
   ```bash
   cd /home/rs/projects/CAR_WASH_WEB
   ```
2. Copy environment file:
   ```bash
   cp .env.example .env
   ```
3. Start all services:
   ```bash
   docker-compose up --build
   ```
4. Access applications:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Admin Portal**: [http://localhost:3000/admin-portal](http://localhost:3000/admin-portal)
   - **Backend API Docs (Swagger)**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)

---

### Option B: Running Locally (Development Mode)

#### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations & seed demo data
python manage.py migrate
python manage.py seed_data

# Run backend development server
python manage.py runserver 0.0.0.0:8000
```

#### 2. Frontend Setup
In a separate terminal:
```bash
cd frontend
npm install --legacy-peer-deps

# Start development server
npm run dev
# OR build for production
npm run build && npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Default Credentials

- **Admin Portal URL**: `/admin-portal`
- **Username**: `admin`
- **Password**: `admin123`

---

## 6. Running Automated Tests

Run the backend test suite:
```bash
cd backend
venv/bin/python manage.py test apps.bookings
```

Tests verify:
- Availability slot generation across operating hours.
- Server-side price calculation and immutable snapshot creation.
- Race-safe booking creation and customer/lead creation.
- Concurrent double-booking prevention under limited staff capacity.
- Past-date rejection.
- Lead capture and status update lifecycle.
- Admin workflow: Confirmation, staff assignment, cancellation, and metrics calculation.

---

## 7. Configurable Providers

### WhatsApp Business Cloud API
Set in `.env`:
```env
WHATSAPP_API_TOKEN="your_meta_system_user_token"
WHATSAPP_PHONE_NUMBER_ID="your_phone_number_id"
```
*Note: If tokens are not provided, the system runs safely in `SIMULATED` mode and writes all outgoing messages into `NotificationLog`.*

### Online Payments (Razorpay)
Set in `.env`:
```env
PAYMENTS_ENABLED=True
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your_secret_key"
```
*By default, `PAYMENTS_ENABLED=False` uses Pay-After-Service mode (Cash or UPI directly upon doorstep job completion).*
