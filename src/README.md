Seat Reservation System Backend

This is a backend system for handling seat reservations, including safe concurrent locking, confirming, and canceling reservations for event-based seating.

## Setup

1. Clone this repo
2. Run `npm install`
3. Set up MongoDB URI and session secret in your `.env` file
4. Run `npm run dev`

## Environment Variables

```env
MONGODB_URI=
SESSION_SECRET=yourSecretKey
PORT=3000
```
