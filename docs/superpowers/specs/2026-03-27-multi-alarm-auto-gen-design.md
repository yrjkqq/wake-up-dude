# Design Spec: Multi-Alarm System with Automated AI Generation

## Goal
Transform the single-alarm AI prototype into a production-ready multiple alarm system. The system should feel like a native alarm app where users manage a list of alarms, while the AI generation happens automatically in the background 1 hour before each scheduled time.

## User Review Required
> [!IMPORTANT]
> This design relies on Android's `AlarmManager` (via Notifee) to wake the app 1 hour before the alarm. On some aggressive battery-saving Android distributions (OEM skins), background execution might be delayed unless the user excludes the app from battery optimization.

## Proposed Changes

### Data Layer
- **SQLite Schema (`alarms` table)**:
    - `id`: INTEGER PRIMARY KEY
    - `time`: TEXT (e.g., "08:00")
    - `days`: TEXT (JSON array of day indices 0-6)
    - `enabled`: INTEGER (0 or 1)
    - `persona`: TEXT (e.g., "毒舌监督员")
    - `lastAudioUri`: TEXT (Path to the most recent successful AI generation)

### Background Architecture
- **Dual-Trigger Strategy**:
    - For every enabled alarm at time `T`, schedule two Notifee triggers:
        1. **AI Generate Trigger** at `T - 1 hour`: A silent notification that starts a Headless JS task.
        2. **Actual Alarm Trigger** at `T`: The high-priority full-screen intent alarm.
- **Fail-safe Logic**:
    - If the "AI Generate Trigger" fails (no network, API error), it will NOT overwrite `lastAudioUri`. The alarm will play the previous day's audio.
- **History Recording**:
    - Move `saveAlarmToHistory` from the AI generation service to the Alarm Trigger UI (`AlarmScreen`). History is only recorded when the alarm actually fires and the user interacts with it.

### UI Components
- **AlarmListScreen**: Component to display all saved alarms with toggle switches.
- **AlarmEditModal**: Component to create/edit alarm time, frequency, and persona.

## Verification Plan

### Automated Tests
- `npm test`: Verify SQLite CRUD operations for the new `alarms` table.
- Mock Notifee triggers to ensuring `T-1h` and `T` are calculated correctly across DST and day boundaries.

### Manual Verification
1. Set an alarm for 5 minutes from now.
2. Manually trigger the "AI Generation" logic via a debug button to ensure it updates the database.
3. Wait for the alarm to fire and verify `lastAudioUri` is played.
4. Turn off Wi-Fi, wait for next generation, verify it gracefully falls back to previous audio.
