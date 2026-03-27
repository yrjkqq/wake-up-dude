# Multi-Alarm System with Automated AI Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-alarm prototype into a production-ready multiple alarm system with automated background AI generation 1 hour before each alarm.

**Architecture:** Use SQLite for persisting multiple alarm records. Use Notifee's Timestamp Trigger for dual-scheduling (generation and ringing). Use React Native's Headless JS to handle background AI audio fetching on Android.

**Tech Stack:** React Native (Expo), Notifee, SQLite, Expo FileSystem, Cloudflare Worker (Backend).

---

### Task 1: Database & Alarm Store Service

**Files:**
- Modify: `/Users/y/Documents/code/wake-up-dude/services/database.ts`

- [ ] **Step 1: Update `initDB` to include `alarms` table**
```typescript
export function initDB() {
  if (!db) return;
  db.execSync(`
    CREATE TABLE IF NOT EXISTS alarm_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      persona TEXT NOT NULL,
      text TEXT NOT NULL,
      audioUri TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alarms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time TEXT NOT NULL,
      days TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      persona TEXT NOT NULL,
      lastAudioUri TEXT
    );
  `);
}
```
- [ ] **Step 2: Add Alarm CRUD functions**
Implement `getAlarms`, `addAlarm`, `updateAlarm`, `deleteAlarm`, and `toggleAlarm`.
- [ ] **Step 3: Commit**
`git add services/database.ts && git commit -m "feat: add alarms table and CRUD operations"`

### Task 2: Background Task Registration

**Files:**
- Modify: `/Users/y/Documents/code/wake-up-dude/index.js` (or creation if missing)
- Modify: `/Users/y/Documents/code/wake-up-dude/services/ai-service.ts`

- [ ] **Step 1: Register Notifee Background Event Handler**
Register a task that listens for the 'AI_GENERATE' trigger.
- [ ] **Step 2: Implement Background Audio Fetch logic**
In `ai-service.ts`, create `generateAlarmAudioForId(alarmId: number)` that fetches and updates the DB.
- [ ] **Step 3: Commit**
`git commit -m "feat: register background task for AI generation"`

### Task 3: Dual-Trigger Alarm Scheduling

**Files:**
- Modify: `/Users/y/Documents/code/wake-up-dude/services/notification-service.ts`

- [ ] **Step 1: Update `scheduleAlarm` to accept an `Alarm` object**
- [ ] **Step 2: Implement `T-1h` Trigger scheduling**
Use Notifee to schedule a silent notification with a custom data payload `{ type: 'AI_GENERATE', alarmId: id }`.
- [ ] **Step 3: Implement `T` Trigger scheduling**
The loud alarm notification.
- [ ] **Step 4: Commit**
`git commit -m "feat: implement dual-trigger alarm scheduling"`

### Task 5: UI Implementation

**Files:**
- Create: `/Users/y/Documents/code/wake-up-dude/app/alarm-list.tsx`
- Modify: `/Users/y/Documents/code/wake-up-dude/app/index.tsx` (to point to list)
- Create: `/Users/y/Documents/code/wake-up-dude/components/AlarmEditModal.tsx`

- [ ] **Step 1: Create Alarm List UI**
- [ ] **Step 2: Create Alarm Edit Modal**
- [ ] **Step 3: Commit**
`git commit -m "feat: implement multi-alarm UI"`

### Task 6: History and Fallback Refinement

**Files:**
- Modify: `/Users/y/Documents/code/wake-up-dude/components/AlarmScreen.tsx`
- Modify: `/Users/y/Documents/code/wake-up-dude/services/ai-service.ts`

- [ ] **Step 1: Move history logging to AlarmScreen**
- [ ] **Step 2: Implement fallback logic in background worker**
- [ ] **Step 3: Commit**
`git commit -m "feat: refine history and fallback logic"`

## Verification Plan

### Automated Tests
- Run `npm test` after Task 1 to verify database logic.

### Manual Verification
1. Open the app, add a new alarm for 5 minutes in the future.
2. Observe the console logs: Verify the "AI Generate" trigger is scheduled for `now - 55 mins` (or similar logic for testing).
3. Manually trigger the background worker (via `notifee.onBackgroundEvent`) using `adb shell` if possible, or by setting a short offset (e.g., 1 minute).
4. Verify the alarm rings with the correct (or fallback) audio.
5. Check History tab to see if the record appeared *after* the alarm triggered.
