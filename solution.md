# Seat Reservation Backend – solution.md

## 📘 API Endpoints

| Method | Endpoint              | Description                          |
| ------ | --------------------- | ------------------------------------ |
| `POST` | `/api/lock`           | Lock a group of seats                |
| `POST` | `/api/confirm`        | Confirm and reserve locked seats     |
| `POST` | `/api/cancel-lock`    | Cancel current session's lock        |
| `GET`  | `/api/seats/:eventID` | Fetch all seats for a specific event |

---

### 1. DB Collections

### Customers

    {
    \_id: ObjectId,
    customerID: ObjectId,
    name: string
    }

### Events

    {
    \_id: ObjectId,
    name: string
    }

### Seats

    {
    \_id: ObjectId,
    eventID: ObjectId,
    name: string,
    isTaken: boolean,
    lockedBy: string | null,
    lockUntil: Date | null,
    status: "available" | "locked" | "confirmed",
    }

### Orders

    {
    \_id: ObjectId,
    customerID: ObjectId,
    amount: number,
    currency: string,
    status: "paid" | "failed"
    }

### Reservations

    {
    \_id: ObjectId,
    customerID: ObjectId,
    eventID: ObjectId,
    seatIDs: ObjectId[],
    orderID: ObjectId,
    status: "confirmed"
    }

## How the Solution Works

### 1. Locking Seats

When a user selects seats, the backend locks them temporarily:

- `lockedBy`: tracks which session (user) locked the seat.
- `lockUntil`: timestamp indicating how long the seat stays locked.

During this time, seats are **unavailable to others**, giving the user time to finish payment.

---

### 2. Session Flow and Lock Lifecycle

The flow is:

1. A user selects seats.
2. The system checks:
   - Seats are not taken.
   - They are either not locked or the lock has expired.
3. If all checks pass, the system locks the seats by:
   - Setting `lockedBy = sessionID`
   - Setting `lockUntil = current time + 10 minutes`
   - Setting `status = "locked`
4. Seats are now reserved temporarily for that user only.

---

### 3. Lock Expiry and Cleanup

If the user does not complete the payment:

- The lock expires automatically after 10 minutes.
- A **scheduled cleanup job** (e.g. cron) runs periodically and:
  - Finds all seats where `lockUntil < now` and `isTaken = false`
  - Clears `lockedBy` and `lockUntil`
  - Resets `status = "available"`

---

### 4. Cleaning Expired session Locks

To avoid seat locks persisting after a user’s session expires (e.g. user closes the browser or logs out), a scheduled cleanup job checks the database regularly.

- It reads all active sessions from the `sessions` collection.
- It finds seats that are locked (`lockedBy !== null`).
- It clears those seat locks if the session that locked them no longer exists.

This prevents:

- Seat starvation (users locking seats and disappearing)
- Edge-case bugs in abandoned sessions

### 5. Safe Concurrent Access

- MongoDB transactions are used during locking and confirmation to ensure that:
  - No two users can lock or confirm the same seat at the same time
  - If any operation in a transaction fails, changes are rolled back

### 6. Confirming After Payment

After payment is successful, the system calls the **confirmation endpoint**, which:

- Verifies the session ID matches the one that locked the seat.
- Confirms that the lock is still valid (not expired).
- If valid, marks:
  - `isTaken = true`
  - `status = "confirmed"`
  - Clears `lockUntil` and `lockedBy`

This **finalizes the booking**, and the seat becomes permanently unavailable to others.

If the lock has expired before confirmation, the system refuses to confirm and the user must restart the process.

### 7. Manual Cancellation

- An explicit `/cancel-lock` API allows a customer to release selected seats
- This is useful when a user exits the booking flow intentionally

---

## How It Solves the Problem

The core problem is **ensuring that seats cannot be double-booked**, while still allowing multiple users to browse and select in real-time.

This system solves it by:

- Using **session-based locking**: Each user's selection is tied to a session, so locks are traceable and can expire or be released.
- Applying **MongoDB transactions**: Ensures atomic updates across multiple seat records.
- Implementing **background cleanup**: Prevents abandoned sessions from holding seats indefinitely.
- Providing **manual control APIs**: Gives the frontend a way to release seats proactively.

---

## Real-World Usage Scenario

1. **Customer A** selects seats, which are locked by setting `lockedBy` and `lockUntil` (e.g., 10 minutes in the future).
2. **Customer B** cannot select these seats until the lock expires or is released.
3. If Customer A confirms the booking before `lockUntil`, seats are marked as taken and lock info cleared.
4. If Customer A abandons the process, the lock expires after the `lockUntil` timestamp, or the cleanup job frees the seats sooner.
5. If Customer A cancels explicitly, the `/cancel-lock` endpoint immediately frees those seats.

---

## Future Recommendations

- Add monitoring & error alerting via Slack or Sentry
- Build frontend UI with real-time seat availability updates
- Implement retry logic for race conditions

- Redis for Lock Management

While the current solution uses MongoDB to store temporary seat locks (`lockUntil`, `lockedBy`), a more efficient and scalable approach would involve using **Redis**

- **In-memory speed**: Redis operates in memory and is extremely fast for read/write operations.
- **Built-in expiry**: Redis allows setting automatic expiration on keys (e.g., 10-minute seat lock).
- **Atomic operations**: Redis supports atomic commands like `SET NX EX` to safely manage locks across concurrent requests.
- **No need for periodic cleanup**: Redis automatically deletes expired locks, reducing backend load and simplifying logic.
