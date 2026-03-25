import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export interface AlarmRecord {
  id: number;
  persona: string;
  text: string;
  audioUri: string;
  createdAt: number;
}

// 🌐 WEB MOCK: Fallback to an uninitialized database pointer when run on pure web DOMs
// This prevents Expo Metro's web bundler from triggering a fatal WASM SharedArrayBuffer crash.
let db: SQLite.SQLiteDatabase | null = null;
if (Platform.OS !== 'web') {
  try {
    db = SQLite.openDatabaseSync('wakeUpDude.db');
  } catch (e) {
    console.warn('[DB] SQLite init skipped or failed:', e);
  }
}

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
  `);
}

export function saveAlarmToHistory(persona: string, text: string, audioUri: string) {
  if (!db) return;
  const statement = db.prepareSync(
    'INSERT INTO alarm_history (persona, text, audioUri, createdAt) VALUES ($persona, $text, $audioUri, $createdAt)'
  );
  statement.executeSync({
    $persona: persona,
    $text: text,
    $audioUri: audioUri,
    $createdAt: Date.now(),
  });
}

export function getAlarmHistory(): AlarmRecord[] {
  // Gracefully return empty arrays on web
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
