import { getDb } from "../db";
import type { Settings } from "../types";

export function getSettings(): Settings {
  return getDb().prepare("SELECT * FROM settings WHERE id = 1").get() as Settings;
}

export function setDailyGoal(dailyGoal: number): Settings {
  getDb()
    .prepare("UPDATE settings SET daily_goal = ? WHERE id = 1")
    .run(dailyGoal);
  return getSettings();
}
