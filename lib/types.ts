export interface DayRecord {
  date: string; // YYYY-MM-DD
  pomodoros: number;
  quality: number | null; // 1..10
  review: string | null;
  updated_at: string;
}

export interface WeeklyReview {
  week_start: string; // Monday, YYYY-MM-DD
  quality: number | null;
  review: string | null;
  plan: string | null;
  updated_at: string;
}

export interface MonthlyReview {
  month: string; // YYYY-MM
  quality: number | null;
  review: string | null;
  plan: string | null;
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
