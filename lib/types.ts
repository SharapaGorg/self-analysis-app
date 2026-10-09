export interface Task {
  id: number;
  date: string; // YYYY-MM-DD, the day this task belongs to
  title: string;
  planned: number; // planned pomodoros, >= 0
  actual: number; // actual pomodoros, >= 0
  done: 0 | 1;
  sort_order: number;
  updated_at: string;
}

export interface DayRecord {
  date: string; // YYYY-MM-DD
  pomodoros: number;
  quality: number | null; // 1..10
  review: string | null; // legacy, retained for migrated data; no longer shown
  mistakes: string | null;
  wins: string | null;
  conclusions: string | null;
  mental: number | null; // 1..10
  mental_note: string | null;
  social: 0 | 1; // 0 = alone, 1 = with someone
  updated_at: string;
}

export interface WeeklyReview {
  week_start: string; // Monday, YYYY-MM-DD
  quality: number | null;
  review: string | null; // legacy
  plan: string | null;
  mistakes: string | null;
  wins: string | null;
  conclusions: string | null;
  updated_at: string;
}

export interface MonthlyReview {
  month: string; // YYYY-MM
  quality: number | null;
  review: string | null; // legacy
  plan: string | null;
  mistakes: string | null;
  wins: string | null;
  conclusions: string | null;
  updated_at: string;
}

export interface Settings {
  id: 1;
  daily_goal: number;
}

export interface DashboardStats {
  range: { from: string; to: string };
  dailyGoal: number;
  totals: {
    today: number;
    week: number;
    month: number;
    allTime: number;
  };
  streak: number; // consecutive days (ending today) meeting the daily goal
  avgPerDay: {
    // average pomodoros per calendar day over each window
    week: number; // last 7 days
    month: number; // last 30 days
    allTime: number; // total / days from first tracked date to today
  };
  series: Array<{ date: string; pomodoros: number; quality: number | null }>;
  weeklyQuality: Array<{ weekStart: string; quality: number | null }>;
  averages: {
    weekQuality: number | null;
    monthQuality: number | null;
  };
  deltas: {
    weekOverWeek: { pomodoros: PctDelta; quality: PointDelta };
    monthOverMonth: { pomodoros: PctDelta; quality: PointDelta };
  };
}

export interface PctDelta {
  current: number;
  previous: number;
  pct: number | null; // null when previous is 0
}

export interface PointDelta {
  current: number | null;
  previous: number | null;
  diff: number | null;
}
