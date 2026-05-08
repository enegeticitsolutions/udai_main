# UDAI Backend

Standalone Express + TypeScript backend for the existing `frontend/` app.

## What it provides

- MongoDB connection at startup
- `GET /api/health`
- `GET /api/content/blog`
- `GET /api/content/events`
- `GET /api/content/products`
- `GET /api/content/testimonials`
- `GET /api/content/therapists`
- `POST /api/forms/contact`
- `POST /api/forms/volunteers`
- `POST /api/forms/donations`
- `POST /api/forms/events/rsvp`
- `POST /api/forms/therapists/inquiries`
- `GET /api/forms/therapists/availability`
- `POST /api/forms/orders`
- `POST /api/payments/razorpay/order`
- `POST /api/payments/razorpay/verify`
- `GET /api/admin/bootstrap`
- `POST /api/admin/login`
- `PATCH /api/admin/inquiries/:id`
- `PATCH /api/admin/volunteers/:id`
- `PATCH /api/admin/orders/:id`
- `PATCH /api/admin/therapists/:id`

## Data model

- Content is read directly from `../frontend/src/app/data/*.json`
- User submissions are stored in `backend/storage/*.json`
- MongoDB is connected at startup for the future database migration, but the app is not yet reading or writing its collections.

This keeps the current frontend content in sync with the backend without forcing a database setup.

## Separate admin hosting

If you host the admin app on a different domain, update `.env` in `backend/`:

```env
CORS_ORIGIN=https://www.example.com,https://admin.example.com
FRONTEND_ORIGIN=https://www.example.com
ADMIN_ORIGIN=https://admin.example.com
```

If you prefer a single line, `CORS_ORIGIN` can also be a comma-separated list:

```env
CORS_ORIGIN=https://admin.example.com,https://www.example.com
```

The backend accepts a comma-separated list of allowed origins.

## Local run

1. `cd backend`
2. `cp .env.example .env`
3. `npm install`
4. `npm run dev`

Make sure `.env` contains:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `CORS_ORIGIN`
- `FRONTEND_ORIGIN`
- `ADMIN_ORIGIN`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Default server URL: `http://localhost:4000`

## Frontend integration

Replace direct JSON imports in the frontend with fetch calls to:

- `http://localhost:4000/api/content/blog`
- `http://localhost:4000/api/content/events`
- `http://localhost:4000/api/content/products`
- `http://localhost:4000/api/content/testimonials`
- `http://localhost:4000/api/content/therapists`

Send forms as JSON to the matching `POST /api/forms/*` endpoints.

## Example requests

### Contact form

```bash
curl -X POST http://localhost:4000/api/forms/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Shubham Tripathi",
    "email": "shubham@example.com",
    "subject": "Volunteer inquiry",
    "message": "I want to contribute to the weekend program."
  }'
```

### Event RSVP

```bash
curl -X POST http://localhost:4000/api/forms/events/rsvp \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": 1,
    "name": "Shubham Tripathi",
    "email": "shubham@example.com",
    "attendees": 2
  }'
```
