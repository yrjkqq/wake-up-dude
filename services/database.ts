import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export interface AlarmRecord {
  id: number;
  persona: string;
  text: string;
  audioUri: string;
  createdAt: number;
  alarmType: AlarmType;
}

export type AlarmType = 'voice' | 'music';

export interface Alarm {
  id: number;
  time: string;
  days: string; // JSON array of day indices 0-6
  enabled: boolean;
  persona: string;
  alarmType: AlarmType;
  lastAudioUri: string | null;
  lastText: string | null;
}

// 🌐 WEB MOCK: Fallback to an uninitialized database pointer when run on pure web DOMs
let db: SQLite.SQLiteDatabase | null = null;
if (Platform.OS !== 'web') {
  try {
    db = SQLite.openDatabaseSync('wakeUpDude.db');
    // Ensure tables exist immediately on open
    db.execSync(`
      CREATE TABLE IF NOT EXISTS alarm_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona TEXT NOT NULL,
        text TEXT NOT NULL,
        audioUri TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        alarmType TEXT DEFAULT 'voice'
      );
      CREATE TABLE IF NOT EXISTS alarms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        time TEXT NOT NULL,
        days TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        persona TEXT NOT NULL,
        lastAudioUri TEXT,
        lastText TEXT
      );
      CREATE TABLE IF NOT EXISTS debug_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        tag TEXT NOT NULL,
        message TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'info'
      );
    `);
    // Migration: add lastText if missing on existing installs
    try {
      db.execSync('ALTER TABLE alarms ADD COLUMN lastText TEXT;');
    } catch {
      // Ignore if column already exists
    }
    // Migration: add alarmType column
    try {
      db.execSync("ALTER TABLE alarms ADD COLUMN alarmType TEXT DEFAULT 'voice';");
    } catch {
      // Ignore if column already exists
    }
    // Migration: add alarmType to alarm_history
    try {
      db.execSync("ALTER TABLE alarm_history ADD COLUMN alarmType TEXT DEFAULT 'voice';");
    } catch {
      // Ignore if column already exists
    }
  } catch (e) {
    console.warn('[DB] SQLite init failed:', e);
  }
}

/**
 * Migration helper (no longer strictly needed for layout if we init on open, 
 * but kept for backwards compatibility if called elsewhere)
 */
export function initDB() {
  // Logic moved to openDatabaseSync block above for zero-latency availability
}

export function saveAlarmToHistory(persona: string, text: string, audioUri: string, alarmType: AlarmType = 'voice') {
  if (!db) return;
  const statement = db.prepareSync(
    'INSERT INTO alarm_history (persona, text, audioUri, createdAt, alarmType) VALUES ($persona, $text, $audioUri, $createdAt, $alarmType)'
  );
  statement.executeSync({
    $persona: persona,
    $text: text,
    $audioUri: audioUri,
    $createdAt: Date.now(),
    $alarmType: alarmType,
  });
}

export function getAlarmHistory(): AlarmRecord[] {
  if (!db) return [];
  return db.getAllSync<AlarmRecord>('SELECT * FROM alarm_history ORDER BY createdAt DESC');
}

export function deleteAlarmHistory(id: number) {
  if (!db) return;
  const statement = db.prepareSync('DELETE FROM alarm_history WHERE id = $id');
  statement.executeSync({ $id: id });
}

export function clearAllHistory() {
  if (!db) return;
  db.execSync('DELETE FROM alarm_history');
}

// --- Alarms CRUD ---

export function getAlarms(): Alarm[] {
  if (!db) return [];
  const rows = db.getAllSync<any>('SELECT * FROM alarms ORDER BY time ASC');
  return rows.map(row => ({
    ...row,
    enabled: !!row.enabled,
    alarmType: row.alarmType || 'voice',
    lastAudioUri: row.lastAudioUri || null,
    lastText: row.lastText || null
  }));
}

export function addAlarm(time: string, days: string, persona: string, alarmType: AlarmType = 'voice'): number {
  if (!db) return -1;
  const statement = db.prepareSync(
    'INSERT INTO alarms (time, days, persona, alarmType, enabled) VALUES ($time, $days, $persona, $alarmType, 1)'
  );
  const result = statement.executeSync({
    $time: time,
    $days: days,
    $persona: persona,
    $alarmType: alarmType,
  });
  return result.lastInsertRowId;
}

export function updateAlarm(id: number, time: string, days: string, persona: string, alarmType: AlarmType = 'voice') {
  if (!db) return;
  const statement = db.prepareSync(
    'UPDATE alarms SET time = $time, days = $days, persona = $persona, alarmType = $alarmType WHERE id = $id'
  );
  statement.executeSync({
    $id: id,
    $time: time,
    $days: days,
    $persona: persona,
    $alarmType: alarmType,
  });
}

export function updateAlarmAudio(id: number, audioUri: string, text: string) {
  if (!db) return;
  const statement = db.prepareSync('UPDATE alarms SET lastAudioUri = $uri, lastText = $text WHERE id = $id');
  statement.executeSync({ $id: id, $uri: audioUri, $text: text });
}

export function toggleAlarm(id: number, enabled: boolean) {
  if (!db) return;
  const statement = db.prepareSync('UPDATE alarms SET enabled = $enabled WHERE id = $id');
  statement.executeSync({ $id: id, $enabled: enabled ? 1 : 0 });
}

export function deleteAlarm(id: number) {
  if (!db) return;
  const statement = db.prepareSync('DELETE FROM alarms WHERE id = $id');
  statement.executeSync({ $id: id });
}

// --- Debug Logging ---

export interface DebugLog {
  id: number;
  timestamp: number;
  tag: string;
  message: string;
  level: string;
}

/**
 * Persist a debug log entry to SQLite.
 * Unlike console.log, these survive app kills and can be reviewed the next day.
 */
export function addDebugLog(tag: string, message: string, level: 'info' | 'warn' | 'error' = 'info') {
  if (!db) return;
  try {
    const statement = db.prepareSync(
      'INSERT INTO debug_logs (timestamp, tag, message, level) VALUES ($ts, $tag, $msg, $level)'
    );
    statement.executeSync({
      $ts: Date.now(),
      $tag: tag,
      $msg: message,
      $level: level,
    });
  } catch (e) {
    // Fallback to console if DB write fails
    console.error('[DebugLog] Failed to write log:', e);
  }
}

/**
 * Get recent debug logs, newest first.
 */
export function getDebugLogs(limit: number = 100): DebugLog[] {
  if (!db) return [];
  return db.getAllSync<DebugLog>(
    'SELECT * FROM debug_logs ORDER BY timestamp DESC LIMIT $limit',
    { $limit: limit }
  );
}

/**
 * Clear all debug logs.
 */
export function clearDebugLogs() {
  if (!db) return;
  db.execSync('DELETE FROM debug_logs');
}
