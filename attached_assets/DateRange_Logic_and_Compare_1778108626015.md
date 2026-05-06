# Task: Date-Range Selection & Comparison Logic

## Project Context

- **Stack:** React, Vite, TypeScript.
- **Database:** Supabase (PostgreSQL) storing timestamps in UTC.
- **Goal:** A robust, timezone-aware date selection system that supports presets, URL synchronization, and performance comparison across two intervals.

---

## Global Principles & Implementation Strategy (The "Skill")

### 1. Late-Binding Calculation (Dynamic Boundaries)

To ensure data is always fresh and comparisons are balanced (apples-to-apples), absolute Start/End timestamps must be calculated **at the moment of the data fetch**.

1.  **Get Base Time:** Identify current UTC time.
2.  **Offset to Target:** Convert current UTC to the user's **Selected Timezone** (using `date-fns-tz`). This represents the current local time.
3.  **Boundary Calculation:**
    - **Start:** Calculate the local start of the preset (e.g., "Today" becomes 00:00:00).
    - **End:** Use the current local time from Step 2 as the End boundary (e.g., if it is 2:00 PM ET, "Today" is 00:00:00 to 14:00:00 ET).
    - _Note:_ This ensures that when shifting to a reference period (e.g., Yesterday), you compare the same fractional day (00:00 to 14:00).
4.  **Revert to UTC:** Convert these local boundaries back to UTC ISO strings for the Supabase query.

### 2. State & Storage Logic

- **Preset IDs:** Every preset must have a unique, permanent **ID**.
- **Persistence:** Use these **IDs exclusively** for storage and referencing. Do not use names or labels in logic.
- **Sync:** Persist the selection (`presetId` or custom range + Timezone) in `localStorage`.
- **URL Schema:** Sync state to query parameters using the ID:
  - `?range_id=today`
  - `?start=ISO&end=ISO` (only if `range_id=custom`)
  - `?compare=true&shift_id=7d`
  - `?tz=America/New_York`

### 3. Profile Timezone Initialization (The "Gating" Principle)

To ensure data integrity and prevent redundant network overhead, the system must treat the retrieval of the user’s profile TimeZone as a blocking prerequisite for all date-dependent data fetching.

- **Query Gating**: All components responsible for data fetching must remain in a "pending" or "gated" state until the user’s preferred TimeZone has been successfully resolved from the database.

- **Prevention of Redundant Fetches**: This prevents a "double-fetch" race condition where a query is initially triggered using a portal default (or browser timezone), only to be immediately superseded and re-run once the user's profile preference is finally loaded.

- **State Management**: The portal should maintain a global initialization state (e.g., isProfileLoaded) to ensure that the very first query sent to the database is calculated with the correct local boundaries from the start.

---

## Task 1: Improve Date-Range Component Selection

**Requirements:**

- The component must allow selecting from a list of presets (Today, This Week, Last 7 days, This Month, Last 30 days) or a "Custom" range.
- **Triggering Fetches:** Data should re-fetch when the Page mounts, the Timezone changes, or the DateRange selection changes.
- **Calculation Utility:** Create a utility that accepts a `presetId` and `timezone` and executes the 4-step "Late-Binding" logic above to return UTC ISO strings.

Note:

---

## Task 2: Prepare Component for Comparison

**Goal:** Enable a "Reference Range" of the same length as the "Base Range," shifted back in time.

**Requirements:**

- **Toggle:** Add a "Compare" toggle in the dropdown.
- **Dynamic Shift Options:**
  - If **Today**: Yesterday (-24h), Week ago (-7d), Month ago (-1mo), or X days ago.
  - If **Week/Last Week**: Week ago (-7d), Month ago (-1mo), or X days ago.
  - If **Month/Last Month**: Month ago (-1mo), or X days ago.
  - If **Custom**: Default shift should be equal to the **duration** of the selected custom range.
- **UI Read-only Display:** When compare is active, show the resolved ranges.
  - Use "NOW" for dynamic end-times (e.g., `NOW` for current interval, `NOW - 24h` for reference).

---

## Task 3: Implement Comparison Math & Rendering

**Goal:** Fetch two datasets (Base and Reference) and display the percentage change.

**Mathematical Logic:**

- **Formula:** `Change % = ((Current - Reference) / |Reference|) * 100`.
- **Undefined States:** If the reference value is `0`, `null`, or missing, or if the current value is missing, display a grey dash (**—**).
- **Polarity:** Each metric must support a boolean `isInverse` flag:
  - `isInverse: false` (Revenue): Increase is Green, Decrease is Red.
  - `isInverse: true` (Cost): Increase is Red, Decrease is Green.

**Visual Requirements:**

- **No Reference Values:** Do not show the absolute value of the reference interval in the table.
- **Placement:** Show the percentage change in parentheses directly underneath the primary value.
- **Styling:**
  - Font: Smaller, subtle style (e.g., `font-size: 0.85em`).
  - Colors: Pale/desaturated tones (e.g., `text-red-400` and `text-green-400`).

---

## Technical Constraints

- **Libraries:** Use `date-fns` and `date-fns-tz`.
- **TypeScript:** Ensure all `presetId` and `shiftId` values are strictly typed as enums or literal types.
- **Parallel Fetching:** Execute the Base and Reference queries in parallel using `Promise.all` or equivalent.
