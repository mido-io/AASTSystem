# AASTSys — Manual Test Guide
### Room & Hall Booking System · AASTMT

> **How to use this guide**: Work through each section top-to-bottom. Each test has preconditions, exact steps, and an expected result. Mark each test ✅ Pass or ❌ Fail as you go.

---

## Setup Checklist (Do This First)

Before running any test, confirm the following are true:

- [ ] `.env.local` exists with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] `schema_complete.sql` was executed in Supabase SQL Editor with no errors
- [ ] Email confirmations are **disabled** in Supabase → Authentication → Settings
- [ ] Admin user was manually created in Supabase Auth and inserted into `public.users`
- [ ] Dev server is running (`npm run dev`) and accessible at `http://localhost:3000`

**Test Accounts to Pre-Create:**

| Account | Employee ID | Email (internal) | Role | Is Approved |
|---|---|---|---|---|
| Admin | `ADMIN` | admin@aastmt.edu | ADMIN | TRUE |
| Branch Manager | `BM001` | bm001@aastmt.edu | BRANCH_MANAGER | TRUE |
| Employee 1 | `EMP001` | emp001@aastmt.edu | EMPLOYEE | TRUE |
| Employee 2 | `EMP002` | emp002@aastmt.edu | EMPLOYEE | TRUE |
| Secretary | `SEC001` | sec001@aastmt.edu | SECRETARY | TRUE |

> Create these via `/register` then approve them manually in SQL, OR create them directly in Supabase Auth + insert profiles with `is_approved = TRUE`.

---

## Section 1 — Authentication

### TEST-AUTH-01: Login with valid Employee ID
**Precondition:** Admin account exists and is approved.

1. Navigate to `http://localhost:3000/login`
2. Enter Employee ID: `ADMIN`
3. Enter correct password
4. Click **Sign in**

**Expected:** Redirected to `/dashboard`. Navbar shows name "System Administrator" with red "Admin" badge.

---

### TEST-AUTH-02: Login with invalid Employee ID
**Precondition:** None.

1. Navigate to `/login`
2. Enter Employee ID: `WRONGID`
3. Enter any password
4. Click **Sign in**

**Expected:** Error message "Invalid Employee ID or password" appears. No redirect occurs.

---

### TEST-AUTH-03: Login with wrong password
**Precondition:** Admin account exists.

1. Navigate to `/login`
2. Enter Employee ID: `ADMIN`
3. Enter wrong password: `badpassword123`
4. Click **Sign in**

**Expected:** Error message "Invalid Employee ID or password" appears.

---

### TEST-AUTH-04: Register as a new Employee
**Precondition:** No account with Employee ID `NEWUSER` exists.

1. Navigate to `/register`
2. Fill in:
   - Full Name: `Test User`
   - Employee ID: `NEWUSER`
   - Role: `Employee / Lecturer`
   - Password: `password123`
   - Confirm Password: `password123`
3. Click **Create Account**

**Expected:** Success screen: "Registration Submitted!" with message about pending admin approval. User is not logged in.

---

### TEST-AUTH-05: Login before admin approves registration
**Precondition:** TEST-AUTH-04 completed. Account not yet approved.

1. Navigate to `/login`
2. Enter Employee ID: `NEWUSER`
3. Enter password: `password123`
4. Click **Sign in**

**Expected:** The login page shows amber banner: "Account Pending Approval — Your registration is awaiting administrator approval."

---

### TEST-AUTH-06: Register with duplicate Employee ID
**Precondition:** Employee ID `EMP001` already exists.

1. Navigate to `/register`
2. Enter Employee ID: `EMP001`
3. Fill remaining valid fields
4. Click **Create Account**

**Expected:** Error message: "An account with this Employee ID already exists."

---

### TEST-AUTH-07: Register with mismatched passwords
**Precondition:** None.

1. Navigate to `/register`
2. Fill valid name and Employee ID
3. Enter Password: `abc123`
4. Enter Confirm Password: `xyz789`
5. Click **Create Account**

**Expected:** Error message: "Passwords do not match."

---

### TEST-AUTH-08: Register with password shorter than 6 characters
1. Navigate to `/register`
2. Fill valid fields, set Password and Confirm Password both to `ab1`
3. Click **Create Account**

**Expected:** Error message: "Password must be at least 6 characters."

---

### TEST-AUTH-09: Register with special characters in Employee ID
1. Navigate to `/register`
2. Enter Employee ID: `EMP-001` (contains a hyphen)
3. Fill remaining valid fields
4. Click **Create Account**

**Expected:** Error: "Employee ID must contain only letters and numbers (no spaces or special characters)."

---

### TEST-AUTH-10: Logout
**Precondition:** Logged in as any user.

1. Click **Sign out** in the top-right navbar

**Expected:** Redirected to `/login`. Navbar shows "Login" button. Navigating to `/dashboard` redirects back to `/login`.

---

### TEST-AUTH-11: Direct URL access without login
**Precondition:** Not logged in (use incognito or after logout).

1. Paste `http://localhost:3000/dashboard` in the browser

**Expected:** Immediately redirected to `/login`.

---

### TEST-AUTH-12: Authenticated user cannot access /login
**Precondition:** Logged in as Admin.

1. Paste `http://localhost:3000/login` in the browser

**Expected:** Immediately redirected to `/dashboard`.

---

## Section 2 — Admin: User Registration Approval

### TEST-USERS-01: Admin sees pending registration
**Precondition:** TEST-AUTH-04 completed (NEWUSER registered, not approved).

1. Log in as Admin
2. Navigate to `/dashboard`

**Expected:** At the top of the page, an amber "Pending Registrations" section appears with one row showing `NEWUSER`, `Test User`, role badge, and registration timestamp.

---

### TEST-USERS-02: Admin approves a registration
**Precondition:** TEST-USERS-01 — NEWUSER is visible in pending list.

1. In the Pending Registrations section, locate `NEWUSER`
2. Click **Approve**

**Expected:**
- Toast: "Test User approved and activated!"
- Row disappears from the pending list.
- Log in as NEWUSER → success, redirected to dashboard.

---

### TEST-USERS-03: Admin rejects a registration
**Precondition:** Another new user `REJECT01` has registered.

1. In the Pending Registrations section, locate `REJECT01`
2. Click **Reject**
3. Confirm the browser confirm dialog

**Expected:**
- Toast: "REJECT01's registration rejected."
- Row disappears.
- Attempting to log in as `REJECT01` redirects back to `/login?pending=true`.

---

## Section 3 — Admin: User Management & Overrides

### TEST-USERMGMT-01: View all non-admin users
**Precondition:** EMP001, SEC001, BM001 accounts exist and are approved.

1. Log in as Admin
2. Click **Users** in the Navbar

**Expected:** Table shows EMP001 (Employee), SEC001 (Secretary), BM001 (Branch Manager). No Admin rows.

---

### TEST-USERMGMT-02: Filter users by role
1. On the Users page, click the **Secretary** tab

**Expected:** Only SEC001 is shown.

---

### TEST-USERMGMT-03: Enable "Can View Availability" for an employee
**Precondition:** EMP001 has `can_view_availability = FALSE`.

1. On the Users page, find EMP001
2. Click the **Disabled** toggle in the "View Availability" column

**Expected:**
- Toggle changes to **Enabled** (green).
- Toast: "Availability view enabled."
- Log in as EMP001 → Weekly Calendar appears above the booking form.

---

### TEST-USERMGMT-04: Disable "Can View Availability"
**Precondition:** EMP001 has `can_view_availability = TRUE`.

1. On the Users page, find EMP001
2. Click the **Enabled** toggle

**Expected:**
- Toggle changes to **Disabled** (grey).
- Toast: "Availability view disabled."
- Log in as EMP001 → No calendar shown. Blind booking form only.

---

### TEST-USERMGMT-05: Change a user's role
**Precondition:** EMP002 exists as EMPLOYEE.

1. On the Users page, find EMP002
2. In the "Change Role" dropdown, select **Secretary**

**Expected:**
- Toast: "Role updated successfully."
- EMP002 row now shows "Secretary" badge.
- Log in as EMP002 → sees Secretary-restricted view (multi-purpose only).

---

## Section 4 — Delegation System

### TEST-DELEG-01: Create a delegation
**Precondition:** EMP001 and EMP002 are approved employees.

1. Log in as Admin
2. Navigate to `/dashboard/admin/delegations`
3. Click **New Delegation**
4. Set Primary Employee: EMP001
5. Set Substitute: EMP002
6. Set Start Date: today
7. Set End Date: 7 days from today
8. Click **Create Delegation**

**Expected:**
- Toast: "Delegation created successfully!"
- New row appears in the delegation table with status **Active Now**.

---

### TEST-DELEG-02: Substitute employee gains calendar access
**Precondition:** TEST-DELEG-01 completed. EMP002 does NOT have `can_view_availability = TRUE`.

1. Log in as EMP002
2. Navigate to `/dashboard`

**Expected:** The Weekly Calendar component appears above EMP002's booking form (granted via active delegation, not by direct override).

---

### TEST-DELEG-03: Standard employee without delegation sees no calendar
**Precondition:** EMP001 has `can_view_availability = FALSE` and no active delegation as substitute.

1. Log in as EMP001
2. Navigate to `/dashboard`

**Expected:** No calendar is shown. Only the blind booking form.

---

### TEST-DELEG-04: Deactivate a delegation
**Precondition:** TEST-DELEG-01 delegation is active.

1. Log in as Admin → Delegations
2. Find the EMP001→EMP002 delegation
3. Click **Deactivate**

**Expected:**
- Toast: "Delegation deactivated."
- Status badge changes to **Inactive**.
- EMP002 loses calendar access on next login.

---

### TEST-DELEG-05: Delete a delegation
**Precondition:** An inactive delegation exists.

1. Click the trash icon for the delegation
2. Confirm the browser dialog

**Expected:** Row disappears from the table.

---

## Section 5 — Employee: Booking Form

### TEST-BOOK-01: Submit a valid lecture room booking (Employee)
**Precondition:** EMP001 logged in. At least one Lecture room and one time slot exist.

1. Log in as EMP001
2. Select Room Type: **Lecture Room (Exceptional)**
3. Select a specific lecture room
4. Set Date: 3 days from today
5. Select Start Time
6. Select End Time (after start)
7. Click **Submit Request**

**Expected:**
- Toast: "Booking request submitted successfully!"
- Request appears in "My Booking Requests" history with status **Pending Review**.

---

### TEST-BOOK-02: Employee cannot book within 24 hours (client-side block)
**Precondition:** EMP001 logged in.

1. Open the date picker
2. Try to select today's date or tomorrow's date (within 24 hours)

**Expected:** Date is disabled/greyed out in the date picker. Cannot be selected.

---

### TEST-BOOK-03: Employee cannot book within 24 hours (server-side block)
**Precondition:** Server-side validation test. EMP001 logged in.

1. Open browser DevTools → Console
2. Manually submit the form with a date within 24 hours using the browser's date override or API call
   *(or change the computer clock to bypass the client-side min date)*
3. Submit the form

**Expected:** Server returns error: "Invalid timeframe. Your operational bounds strictly restrict scheduling prior to [date]…" The booking is NOT created.

---

### TEST-BOOK-04: Employee can see only Lecture and Multi-Purpose options
**Precondition:** EMP001 logged in.

1. Look at the Room Type dropdown

**Expected:** Two options: "Lecture Room (Exceptional)" and "Multi-Purpose Room". No hidden or extra options.

---

### TEST-BOOK-05: Submit a valid Multi-Purpose booking (Employee)
**Precondition:** EMP001 logged in. Multi-Purpose room exists.

1. Select Room Type: **Multi-Purpose Room**
2. Select a multi-purpose room
3. Set Date: 5 days from today
4. Select Start and End times
5. Fill in: Purpose, Manager Name, Job Title, Mobile Number
6. Set Microphones: 2
7. Check **Requires Laptop**
8. Click **Submit Request**

**Expected:**
- Toast: "Booking request submitted!"
- Request appears in history as **Pending Review**.

---

### TEST-BOOK-06: Multi-purpose form validation — required fields
**Precondition:** EMP001 logged in, Room Type = Multi-Purpose.

1. Fill date, room, times
2. Leave **Manager Name** empty
3. Click **Submit Request**

**Expected:** Toast error: "All event manager details are required for multi-purpose bookings."

---

### TEST-BOOK-07: View rejection with suggested alternative
**Precondition:** EMP001 has a REJECTED booking with `rejection_reason` and `suggested_alternative` set by admin.

1. Log in as EMP001
2. Look at "My Booking Requests"

**Expected:**
- Rejected request shows a red card.
- **Reason:** text appears.
- **Suggested Alternative:** text appears in amber.

---

## Section 6 — Secretary: Restricted Booking

### TEST-SEC-01: Secretary sees only Multi-Purpose room type
**Precondition:** SEC001 logged in.

1. Navigate to `/dashboard`
2. Examine the booking form

**Expected:**
- No "Room Type" dropdown exists (hidden).
- An info banner reads: "As a Secretary, you may only book Multi-Purpose rooms with at least 48 hours advance notice."
- Only multi-purpose rooms appear in the room selector.

---

### TEST-SEC-02: Secretary cannot book within 48 hours (client-side)
**Precondition:** SEC001 logged in.

1. Open the date picker

**Expected:** Dates within 48 hours from now are disabled.

---

### TEST-SEC-03: Secretary cannot book within 48 hours (server-side)
**Precondition:** SEC001 logged in.

1. Attempt to submit a booking with a date within 48 hours (bypass client-side using DevTools or API)

**Expected:** Server error: "Invalid timeframe…" Booking is NOT created.

---

### TEST-SEC-04: Secretary submits valid multi-purpose booking
**Precondition:** SEC001 logged in.

1. Select a multi-purpose room
2. Set Date: 3 days from today
3. Select times
4. Fill all event manager fields
5. Submit

**Expected:** Toast success. Request in history as **Pending Review**.

---

## Section 7 — Admin: Booking Approval Workflow

### TEST-APPROVE-01: Admin sees pending booking requests
**Precondition:** At least one PENDING booking exists (from TEST-BOOK-01).

1. Log in as Admin
2. Navigate to `/dashboard`

**Expected:** Pending Booking Requests table shows the booking with requester name, room, date, time, and type badge.

---

### TEST-APPROVE-02: Admin approves a lecture booking
**Precondition:** EMP001 has a PENDING exceptional lecture booking.

1. Log in as Admin
2. In the pending requests table, click **Approve** on EMP001's lecture booking

**Expected:**
- Toast: "Booking Approved!"
- Row disappears from pending table.
- Log in as EMP001 → booking history shows status **Approved**.

---

### TEST-APPROVE-03: Admin approves a multi-purpose booking (routes to Branch Manager)
**Precondition:** SEC001 has a PENDING multi-purpose booking.

1. Log in as Admin
2. Click **Approve** on SEC001's multi-purpose booking

**Expected:**
- Toast: "Forwarded to Branch Manager for final approval!"
- Row disappears from admin's pending list.
- Log in as Branch Manager → booking appears in their queue.
- Log in as SEC001 → booking shows status **Awaiting Branch Manager**.

---

### TEST-APPROVE-04: Admin rejects a booking with reason only
**Precondition:** A PENDING booking exists.

1. Click **Reject** on any pending booking
2. Fill in **Rejection Reason**: "Room is occupied by a fixed lecture."
3. Leave **Suggested Alternative** empty
4. Click **Confirm Rejection**

**Expected:**
- Toast: "Booking rejected. User has been notified."
- Row disappears.
- Requester sees rejection reason but no alternative.

---

### TEST-APPROVE-05: Admin rejects with reason AND suggested alternative
**Precondition:** A PENDING booking exists.

1. Click **Reject**
2. Rejection Reason: "Room A is booked by fixed schedule."
3. Suggested Alternative: "Try Room B at the same time, or Room A at 2 PM."
4. Click **Confirm Rejection**

**Expected:**
- Toast success.
- Log in as the requester → rejection card shows both **Reason** and **Suggested Alternative** fields.

---

### TEST-APPROVE-06: Admin cannot approve when rejection reason is empty
**Precondition:** Rejection modal is open.

1. Click **Reject** on a booking
2. Leave Rejection Reason empty
3. Click **Confirm Rejection**

**Expected:** Toast error: "Please provide a rejection reason." Modal stays open.

---

## Section 8 — Conflict Prevention

### TEST-CONFLICT-01: Admin cannot approve conflicting booking
**Precondition:** Room A is APPROVED for date D at slot S. Another PENDING booking exists for Room A, date D, slot S.

1. Log in as Admin
2. Try to click **Approve** on the second (conflicting) booking

**Expected:** Toast error: "Conflict detected: The selected room is already booked during this time." Booking status remains PENDING.

---

### TEST-CONFLICT-02: User cannot submit conflicting booking
**Precondition:** Room A is APPROVED for date D at slot S.

1. Log in as EMP001
2. Select Room A, same date D, overlapping time slot
3. Click **Submit Request**

**Expected:** Toast error: "This room is already booked during the selected time." No booking is created.

---

### TEST-CONFLICT-03: Fixed schedule blocks conflicting approvals
**Precondition:** A FIXED booking exists for Room A every Monday at 9:00–10:30.

1. Submit a PENDING booking for Room A next Monday 9:00–10:30
2. Log in as Admin → attempt to Approve

**Expected:** Conflict error. Fixed bookings cannot be overridden.

---

## Section 9 — Branch Manager Workflow

### TEST-BM-01: Branch Manager dashboard shows only ADMIN_APPROVED multi-purpose
**Precondition:** BM001 logged in. Some ADMIN_APPROVED multi-purpose bookings exist.

1. Log in as BM001
2. Navigate to `/dashboard` (auto-redirects to `/dashboard/branch-manager`)

**Expected:** Page shows "Pending Final Approval" list with MULTI_PURPOSE bookings in ADMIN_APPROVED state only. No lecture bookings. No PENDING bookings.

---

### TEST-BM-02: Branch Manager can expand event details
**Precondition:** An ADMIN_APPROVED multi-purpose booking exists with event manager details.

1. Click **Show event details** link on any booking

**Expected:** Expandable section reveals:
- Event Manager Name, Title, Mobile
- Technical requirements (Laptop, Video Conf, Microphone count)

---

### TEST-BM-03: Branch Manager approves a multi-purpose booking
**Precondition:** ADMIN_APPROVED booking exists.

1. Click **Approve** on the booking

**Expected:**
- Toast: "Multi-purpose booking fully approved!"
- Row disappears.
- Original requester's history shows **Approved** status.

---

### TEST-BM-04: Branch Manager rejects with reason
**Precondition:** ADMIN_APPROVED booking exists.

1. Click **Reject**
2. Enter reason: "Venue not available for this purpose."
3. Click **Confirm Rejection**

**Expected:**
- Toast: "Booking rejected."
- Requester sees rejection reason in their history.

---

### TEST-BM-05: Branch Manager cannot access Admin-only routes
**Precondition:** BM001 logged in.

1. Navigate to `http://localhost:3000/dashboard/admin/users`

**Expected:** Either redirected to `/dashboard` (which redirects to branch-manager) OR an access error is shown. The user management data is not accessible.

---

## Section 10 — Admin: Calendar View

### TEST-CAL-01: Weekly calendar shows all booking types
**Precondition:** Admin logged in. At least one FIXED, EXCEPTIONAL, and MULTI_PURPOSE approved booking exists this week.

1. Navigate to `/dashboard/admin/calendar`

**Expected:**
- Grid shows current week (Sun–Sat) × time slots.
- **Blue** cells: FIXED bookings.
- **Yellow** cells: EXCEPTIONAL bookings.
- **Green** cells: MULTI_PURPOSE bookings.
- Each cell shows room name and requester name.

---

### TEST-CAL-02: Navigate to previous/next week
1. Click the left arrow (Previous week)
2. Click the right arrow (Next week)

**Expected:** Grid dates update. Bookings for that week are loaded.

---

### TEST-CAL-03: Monthly view toggle
1. Click the **Month** view button

**Expected:** Calendar switches to monthly grid view showing booking density per day.

---

## Section 11 — Admin: Room Search (Empty Room Finder)

### TEST-SEARCH-01: Find available lecture rooms
**Precondition:** Some rooms are booked, some are free.

1. Navigate to `/dashboard/admin/search`
2. Select a specific date
3. Select a time slot
4. Set Room Type: **Lecture**
5. Click **Search**

**Expected:** List of lecture rooms with **no confirmed booking** during that slot appears.

---

### TEST-SEARCH-02: Search returns no results when all rooms booked
**Precondition:** All lecture rooms are booked on a specific date/time.

1. Search for that date, time, room type

**Expected:** "No available rooms found" message.

---

### TEST-SEARCH-03: Search filters by Multi-Purpose type
1. Select a date, time, and Room Type: **Multi-Purpose**
2. Click Search

**Expected:** Only multi-purpose rooms appear in results.

---

## Section 12 — Admin: Settings (Rooms & Time Slots)

### TEST-SETTINGS-01: Add a new room
1. Navigate to `/dashboard/admin/settings`
2. Click **Add Room**
3. Enter Room Name: `Test Lab 01`
4. Select Type: `Lecture`
5. Click **Save Data**

**Expected:** Toast success. `Test Lab 01` appears in the rooms table as Active.

---

### TEST-SETTINGS-02: Edit an existing room
1. Click the edit (pencil) icon on `Test Lab 01`
2. Change name to `Test Lab 002`
3. Click **Save Data**

**Expected:** Toast success. Room name updates in the table.

---

### TEST-SETTINGS-03: Disable a room
1. Click the power-off icon on `Test Lab 002`

**Expected:**
- Toast: "Room disabled."
- Row shows **Disabled** badge and is greyed out.
- `Test Lab 002` no longer appears in the booking form's room selector.

---

### TEST-SETTINGS-04: Add a new time slot (Ramadan adjustment scenario)
1. Click **Add Slot**
2. Set Start Time: `08:00`
3. Set End Time: `09:00`
4. Click **Save Data**

**Expected:** Toast success. New slot appears in time slots table.

---

### TEST-SETTINGS-05: Disable a time slot
1. Click the power-off icon on an existing time slot

**Expected:**
- Toast: "Slot disabled."
- Slot no longer appears in the booking form dropdowns.

---

### TEST-SETTINGS-06: Generate a 16-week fixed academic schedule (no conflicts)
**Precondition:** A lecture room and active time slots exist. No conflicting bookings for those Mondays.

1. In "Fixed Academic Schedules" section:
   - Select a room
   - Set Start Date (Week 1): next Monday
   - Select Start Time slot
   - Select End Time slot
2. Click **Generate 16 Weeks**

**Expected:**
- Toast: "Successfully generated 16-week Fixed Schedule!"
- 16 FIXED bookings appear in the Calendar view (blue) on consecutive Mondays.

---

### TEST-SETTINGS-07: Fixed schedule generation aborts on conflict
**Precondition:** One of the 16 Mondays already has an APPROVED booking for the same room and time.

1. Attempt to generate the 16-week schedule with the same room/slot

**Expected:** Toast error: "Conflict detected on [date]! Schedule generation aborted." Zero bookings are created (atomic transaction).

---

## Section 13 — Admin: Booking a Multi-Purpose Room (SRD Scenario 1)

### TEST-SCENARIO-01: Admin submits a multi-purpose booking for themselves
**Precondition:** Admin has access to booking form (note: current system routes admin to AdminView only — this test verifies the workflow via direct DB or a workaround).

> **Note:** Per SRD, if the Admin requests a Multi-Purpose Room, it must route to the Branch Manager. Verify by:

1. Insert a booking directly via Supabase with `user_id = admin_id`, `type = MULTI_PURPOSE`, `status = PENDING`
2. Log in as Admin → go to dashboard
3. The Admin's own pending request should appear and they can approve it themselves → status becomes `ADMIN_APPROVED`
4. Log in as Branch Manager → the booking appears for final approval

**Expected:** Admin-originated multi-purpose bookings follow the same two-step approval chain.

---

## Section 14 — End-to-End Scenario Flows

### TEST-E2E-01: Full Employee Blind Booking Flow
1. Register as `FULLTEST` Employee → wait for admin approval
2. Admin approves `FULLTEST`
3. `FULLTEST` logs in → sees blind form, no calendar
4. `FULLTEST` submits booking for Room A, 3 days from today
5. Admin sees the request in pending list
6. Admin checks calendar → Room A is free → Admin approves
7. `FULLTEST` logs in → request history shows **Approved**

**Expected:** All 7 steps work without errors.

---

### TEST-E2E-02: Full Rejection with Alternative Flow (SRD Scenario 2)
1. EMP001 submits a booking for Room A on Sunday at 10 AM (3 days from now)
2. Admin sees the request
3. Admin notices Room A has a fixed lecture at that time (checks Calendar)
4. Admin clicks **Reject** → enters reason: "Room occupied by fixed schedule." → enters alternative: "Try Room C at 10 AM or Room A at 12 PM."
5. EMP001 logs in → sees red rejection card with both reason and alternative
6. EMP001 submits a new request for Room C at 10 AM based on the suggestion
7. Admin approves the new request

**Expected:** Full rejection-and-rebooking cycle works correctly.

---

### TEST-E2E-03: Full Multi-Purpose Approval Chain (SRD Scenario 1 variant)
1. SEC001 submits a multi-purpose booking 3 days from now
2. Admin sees pending request → approves → toast says "Forwarded to Branch Manager"
3. SEC001's history shows **Awaiting Branch Manager**
4. Branch Manager logs in → sees booking in queue → expands details → approves
5. SEC001's history shows **Approved**

**Expected:** Full 3-step chain (SEC → Admin pre-approval → Branch Manager final) works.

---

### TEST-E2E-04: Delegation + Calendar Access Flow
1. Admin creates delegation: EMP001 (primary) → EMP002 (substitute) for this week
2. EMP002 logs in → sees Weekly Calendar (inherited via delegation)
3. EMP002 uses calendar to identify a free slot → submits a booking
4. Admin deactivates the delegation
5. EMP002 logs in again → calendar is gone

**Expected:** Access is correctly granted and revoked.

---

### TEST-E2E-05: Time Slot Adjustment for Ramadan (SRD Scenario 3)
1. Admin navigates to Settings → Time Slots
2. Disables existing 08:00–09:30 slot
3. Adds new slot: 08:00–08:45 (shorter duration)
4. Adds new slot: 08:45–09:30
5. Employee logs in → booking form only shows the new shorter slots
6. Admin re-enables the original slot later

**Expected:** Slot changes are immediately reflected in the booking form without any code change.

---

## Section 15 — UI/UX & Accessibility Checks

### TEST-UX-01: Loading spinners appear during async operations
- [ ] Login button shows spinner while authenticating
- [ ] Register button shows spinner while submitting
- [ ] Booking submit button shows spinner while processing
- [ ] Approve/Reject buttons show spinner while processing
- [ ] Calendar shows spinner while loading data

---

### TEST-UX-02: Mobile responsiveness
1. Open Chrome DevTools → Toggle device toolbar → Select iPhone 12 (390×844)
2. Check each of the following pages:

- [ ] `/login` — form is readable and usable
- [ ] `/register` — form is readable and usable
- [ ] `/dashboard` (Employee view) — booking form stacks vertically
- [ ] `/dashboard` (Admin view) — pending table scrolls horizontally
- [ ] `/dashboard/branch-manager` — booking cards stack properly
- [ ] `/dashboard/admin/settings` — sections are readable

---

### TEST-UX-03: AASTMT brand colors are applied
- [ ] Primary navy blue (`#002855`) used in navbar, headings, primary buttons
- [ ] Secondary gold/yellow (`#ffc72c`) used in submit buttons, badges, accents
- [ ] Background is off-white/light grey (not pure white)
- [ ] Role badges use consistent color coding

---

### TEST-UX-04: Toast notifications appear for all actions
| Action | Expected Toast |
|---|---|
| Booking submitted | ✅ Success |
| Booking approved | ✅ Success |
| Booking rejected | ✅ Success |
| User approved | ✅ Success |
| User rejected | ✅ Success |
| Room created | ✅ Success |
| Room disabled | ✅ Success |
| Time slot created | ✅ Success |
| Delegation created | ✅ Success |
| Conflict detected | ❌ Error (red) |
| Server validation fail | ❌ Error (red) |

---

### TEST-UX-05: Navbar adapts to user role
| Logged In As | Expected Navbar Links |
|---|---|
| Not logged in | Login button only |
| EMPLOYEE | Brand + Sign out |
| SECRETARY | Brand + Sign out |
| BRANCH_MANAGER | Brand + Sign out |
| ADMIN | Brand + Requests + Calendar + Room Search + Users + Delegations + Settings + Sign out |

---

## Test Results Summary

| Section | Total Tests | Passed | Failed |
|---|---|---|---|
| 1 — Authentication | 12 | | |
| 2 — User Registration Approval | 3 | | |
| 3 — User Management | 5 | | |
| 4 — Delegation | 5 | | |
| 5 — Employee Booking | 7 | | |
| 6 — Secretary Booking | 4 | | |
| 7 — Admin Approval | 6 | | |
| 8 — Conflict Prevention | 3 | | |
| 9 — Branch Manager | 5 | | |
| 10 — Calendar | 3 | | |
| 11 — Room Search | 3 | | |
| 12 — Settings | 7 | | |
| 13 — Admin Multi-Purpose Scenario | 1 | | |
| 14 — End-to-End Scenarios | 5 | | |
| 15 — UI/UX Checks | 5 | | |
| **TOTAL** | **83** | | |

---

*AASTSys Manual Test Guide — Generated for SRD v1.0*
