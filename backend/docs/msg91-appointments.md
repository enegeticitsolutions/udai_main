# MSG91 WhatsApp Therapist Appointments

## Webhook

Configure the final MSG91 bot-flow webhook node to call:

```text
POST /api/webhooks/msg91
```

If `MSG91_WEBHOOK_SECRET` is configured, send the same value in:

```text
x-msg91-webhook-secret: your-secret
```

## Sample Request

```json
{
  "booking_id": "MSG91-DEMO-1001",
  "patient_name": "Aarav Sharma",
  "phone_number": "919876543210",
  "age": 8,
  "gender": "Male",
  "city": "Delhi",
  "preferred_language": "Hindi",
  "therapist_id": "THER-102",
  "therapist_name": "Ms Sakshi",
  "appointment_date": "2026-06-12",
  "appointment_time": "10:30",
  "appointment_type": "In-Person",
  "main_concern": "Speech delay",
  "concern_description": "Needs assessment for delayed speech development.",
  "additional_notes": "Parent prefers morning appointments.",
  "payment_status": "pending",
  "booking_status": "pending"
}
```

## Success Response

```json
{
  "success": true,
  "data": {
    "id": "mongodb-object-id",
    "bookingId": "MSG91-DEMO-1001",
    "patientName": "Aarav Sharma",
    "bookingStatus": "pending"
  },
  "message": "Booking saved successfully"
}
```

Repeated delivery of the same `booking_id`, or the same phone number, date, and time, returns HTTP `200` without creating another appointment.

## Admin APIs

```text
GET   /api/admin/appointments
GET   /api/admin/appointments/metrics
GET   /api/admin/appointments/events
GET   /api/admin/appointments/:id
PATCH /api/admin/appointments/:id/status
```

Listing filters:

```text
search
bookingStatus
therapistId
dateFrom
dateTo
page
limit
sortBy
sortOrder
```

Status update body:

```json
{
  "bookingStatus": "confirmed"
}
```

Valid statuses:

```text
pending
confirmed
completed
cancelled
```
