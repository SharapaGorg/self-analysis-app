# Планирование дня и редизайн ревью — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить планирование дня по задачам (план/факт помодоров), 3-польное ревью дня (ошибки/победы/выводы), менталку, социальный тогл и авто-сводки недели/месяца через Haiku.

**Architecture:** Next.js 15 App Router + better-sqlite3 (один локальный пользователь). Новая таблица `tasks` (задачи дня), новые колонки в `days`. `days.pomodoros` пересчитывается из суммы факта по задачам, что сохраняет совместимость со всей существующей аналитикой. LLM-вызовы (Haiku 4.5) через серверный модуль `lib/llm.ts`.

**Tech Stack:** TypeScript, Next.js 15, better-sqlite3, React 19, Tailwind, vitest, @anthropic-ai/sdk.

**Spec:** `docs/superpowers/specs/2026-10-09-planning-and-review-redesign-design.md`

## Global Constraints

- БД `data.db` — локальная, в `.gitignore`; не коммитить.
- Миграции идемпотентны, выполняются в `lib/db.ts::migrate()` при открытии БД.
- `days.pomodoros` остаётся колонкой; для дней с задачами = `SUM(tasks.actual)`, для дней без задач = ручное значение.
- Существующие тесты `test/stats.test.ts` и `test/dates.test.ts` должны проходить без правок.
- Поле `days.review` НЕ удаляем (SQLite drop column рискован) — просто перестаём показывать в UI.
- Haiku модель: `claude-haiku-4-5-20251001`. `ANTHROPIC_API_KEY` из `.env.local`, только серверно.
- Валидаторы возвращают `undefined` при невалидном значении (паттерн `lib/validate.ts`).
- Комментарии/тексты UI — по-русски, как в существующем коде.

## Review Focus

- **Пустой/пробельный title задачи** → POST должен отклонять (400), не создавать пустую задачу.
- **Пересчёт pomodoros при удалении последней задачи дня** → день остаётся с `pomodoros = 0` (не падает, не NULL).
- **PUT дня с `pomodoros` в теле для дня, у которого есть задачи** → значение из тела игнорируется, остаётся сумма факта.
- **Кнопка сводки без `ANTHROPIC_API_KEY`** → понятная ошибка в UI, приложение не падает.
- **LLM вернул невалидный JSON** → fallback (весь текст в `conclusions` при split; для сводки — читаемая ошибка), без необработанного исключения.

---

## Test harness для репозиториев

Репо-тесты бьют в реальный SQLite. Используем временный файл БД через `DB_PATH`, выставленный ДО импорта модулей, и общий helper.

Create: `test/helpers/testdb.ts`
```ts
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// Должно вызываться в самом верху тест-файла, до импорта lib/db.
export function useTempDb(): string {
  const p = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "sad-test-")),
    "test.db",
  );
  process.env.DB_PATH = p;
  return p;
}
```
В тест-файле: `useTempDb()` на первой строке, затем `import` репозиториев (vitest выполняет импорты после hoisting — поэтому используем `await import()` внутри `beforeAll`, либо ставим `DB_PATH` через отдельный setup). Практично: в каждом репо-тесте делаем динамический импорт:
```ts
import { beforeAll, describe, it, expect } from "vitest";
import { useTempDb } from "./helpers/testdb";

let repo: typeof import("../lib/repos/tasks");
let daysRepo: typeof import("../lib/repos/days");
beforeAll(async () => {
  useTempDb();
  repo = await import("../lib/repos/tasks");
  daysRepo = await import("../lib/repos/days");
});
```

---

## Task 1: Миграция схемы + типы

**Files:**
- Modify: `lib/db.ts:20-54` (функция `migrate`)
- Modify: `lib/types.ts`
- Test: `test/migrate.test.ts`

**Interfaces:**
- Produces: таблица `tasks(id, date, title, planned, actual, done, sort_order, updated_at)`; колонки `days`: `mistakes, wins, conclusions, mental, mental_note, social`; колонки `weekly_reviews`/`monthly_reviews`: `mistakes, wins, conclusions`.
- Produces типы: `Task`, расширенный `DayRecord`, расширенные `WeeklyReview`/`MonthlyReview`.

- [ ] **Step 1: Failing test** — `test/migrate.test.ts`
```ts
import { beforeAll, describe, it, expect } from "vitest";
import { useTempDb } from "./helpers/testdb";

let getDb: typeof import("../lib/db").getDb;
beforeAll(async () => {
  useTempDb();
  ({ getDb } = await import("../lib/db"));
});

function cols(table: string): string[] {
  return (getDb().prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((r) => r.name);
}

describe("migrate", () => {
  it("creates tasks table with expected columns", () => {
    expect(cols("tasks").sort()).toEqual(
      ["actual", "date", "done", "id", "planned", "sort_order", "title", "updated_at"].sort(),
    );
  });
  it("adds new columns to days", () => {
    const c = cols("days");
    for (const col of ["mistakes", "wins", "conclusions", "mental", "mental_note", "social"]) {
      expect(c).toContain(col);
    }
  });
  it("adds 3 review columns to weekly_reviews and monthly_reviews", () => {
    for (const t of ["weekly_reviews", "monthly_reviews"]) {
      for (const col of ["mistakes", "wins", "conclusions"]) expect(cols(t)).toContain(col);
    }
  });
  it("is idempotent — opening twice does not throw", () => {
    expect(() => getDb().pragma("user_version")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run, verify fail**
Run: `npm test -- migrate`
Expected: FAIL (колонок нет).

- [ ] **Step 3: Implement** — в `lib/db.ts::migrate`, после существующего `db.exec(...)`:
```ts
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      title      TEXT NOT NULL,
      planned    INTEGER NOT NULL DEFAULT 0,
      actual     INTEGER NOT NULL DEFAULT 0,
      done       INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
  `);

  const addColumn = (table: string, col: string, decl: string) => {
    const existing = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((r) => r.name);
    if (!existing.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`);
  };
  addColumn("days", "mistakes", "TEXT");
  addColumn("days", "wins", "TEXT");
  addColumn("days", "conclusions", "TEXT");
  addColumn("days", "mental", "INTEGER");
  addColumn("days", "mental_note", "TEXT");
  addColumn("days", "social", "INTEGER NOT NULL DEFAULT 0");
  for (const t of ["weekly_reviews", "monthly_reviews"]) {
    addColumn(t, "mistakes", "TEXT");
    addColumn(t, "wins", "TEXT");
    addColumn(t, "conclusions", "TEXT");
  }
```
(Не используем FK с `ON DELETE CASCADE` на `tasks.date`, т.к. старые `days` могут отсутствовать на момент создания задачи; каскад по дате реализуем в репозитории.)

- [ ] **Step 4: Update types** — `lib/types.ts`:
```ts
export interface Task {
  id: number;
  date: string;
  title: string;
  planned: number;
  actual: number;
  done: 0 | 1;
  sort_order: number;
  updated_at: string;
}
```
Расширить `DayRecord`: `mistakes: string | null; wins: string | null; conclusions: string | null; mental: number | null; mental_note: string | null; social: 0 | 1;`
Расширить `WeeklyReview` и `MonthlyReview`: `mistakes: string | null; wins: string | null; conclusions: string | null;`

- [ ] **Step 5: Run tests** — `npm test -- migrate` → PASS. Также `npm test` целиком (stats/dates не должны сломаться от типов — заполнить новые поля в их фикстурах, если TS ругается; см. Task 2 примечание).

- [ ] **Step 6: Commit** — `git add lib/db.ts lib/types.ts test/` ; `git commit -m "feat: schema migration for tasks + extended day/review fields"`

---

## Task 2: Валидаторы

**Files:**
- Modify: `lib/validate.ts`
- Test: `test/validate.test.ts`

**Interfaces:**
- Produces: `parseTitle(v): string | undefined`, `parseBool(v): 0 | 1 | undefined`.

- [ ] **Step 1: Failing test** — `test/validate.test.ts`
```ts
import { describe, it, expect } from "vitest";
import { parseTitle, parseBool } from "../lib/validate";

describe("parseTitle", () => {
  it("trims and accepts non-empty", () => expect(parseTitle("  foo ")).toBe("foo"));
  it("rejects empty/whitespace", () => {
    expect(parseTitle("   ")).toBeUndefined();
    expect(parseTitle("")).toBeUndefined();
    expect(parseTitle(42)).toBeUndefined();
  });
});
describe("parseBool", () => {
  it("accepts true/false/0/1", () => {
    expect(parseBool(true)).toBe(1);
    expect(parseBool(false)).toBe(0);
    expect(parseBool(1)).toBe(1);
    expect(parseBool(0)).toBe(0);
  });
  it("rejects other", () => expect(parseBool("x")).toBeUndefined());
});
```

- [ ] **Step 2: Run, verify fail** — `npm test -- validate`

- [ ] **Step 3: Implement** — в `lib/validate.ts`:
```ts
export function parseTitle(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

export function parseBool(v: unknown): 0 | 1 | undefined {
  if (v === true || v === 1) return 1;
  if (v === false || v === 0) return 0;
  return undefined;
}
```

- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: parseTitle and parseBool validators"`

---

## Task 3: Расширение репозитория дней (новые поля)

**Files:**
- Modify: `lib/repos/days.ts`
- Test: `test/days-repo.test.ts`

**Interfaces:**
- Consumes: расширенный `DayRecord`.
- Produces: `DayUpsert` с полями `mistakes?, wins?, conclusions?, mental?, mental_note?, social?`; `upsertDay` сохраняет их. Экспорт `recomputePomodoros(date)` появится в Task 4, здесь не трогаем.

- [ ] **Step 1: Failing test** — `test/days-repo.test.ts`
```ts
import { beforeAll, describe, it, expect } from "vitest";
import { useTempDb } from "./helpers/testdb";
let days: typeof import("../lib/repos/days");
beforeAll(async () => { useTempDb(); days = await import("../lib/repos/days"); });

describe("upsertDay new fields", () => {
  it("persists mistakes/wins/conclusions/mental/social", () => {
    const rec = days.upsertDay("2026-10-01", {
      mistakes: "m", wins: "w", conclusions: "c", mental: 7, mental_note: "ok", social: 1,
    });
    expect(rec.mistakes).toBe("m");
    expect(rec.wins).toBe("w");
    expect(rec.conclusions).toBe("c");
    expect(rec.mental).toBe(7);
    expect(rec.social).toBe(1);
  });
  it("defaults social to 0", () => {
    const rec = days.upsertDay("2026-10-02", { quality: 5 });
    expect(rec.social).toBe(0);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npm test -- days-repo`

- [ ] **Step 3: Implement** — переписать `upsertDay` и `DayUpsert` в `lib/repos/days.ts`, добавив новые поля в INSERT/UPDATE (паттерн `patch.x !== undefined ? patch.x : existing?.x ?? default`). SELECT `*` уже вернёт новые колонки. `social` default 0.

- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: day repo persists new review/mental/social fields"`

---

## Task 4: Репозиторий задач + пересчёт pomodoros

**Files:**
- Create: `lib/repos/tasks.ts`
- Modify: `lib/repos/days.ts` (экспорт `recomputePomodoros`)
- Test: `test/tasks-repo.test.ts`

**Interfaces:**
- Produces:
  - `listTasks(date: string): Task[]` — по `sort_order, id`.
  - `createTask(date: string, title: string, planned: number): Task` — создаёт день (upsert) при необходимости, `sort_order` = max+1.
  - `updateTask(id: number, patch: { title?: string; planned?: number; actual?: number; done?: 0|1; sort_order?: number }): Task`
  - `deleteTask(id: number): void`
  - `recomputePomodoros(date: string): void` — если у даты есть задачи, пишет `days.pomodoros = SUM(actual)`; иначе не трогает.
- Все мутации (`create/update/delete`) вызывают `recomputePomodoros(date)`.

- [ ] **Step 1: Failing test** — `test/tasks-repo.test.ts`
```ts
import { beforeAll, describe, it, expect } from "vitest";
import { useTempDb } from "./helpers/testdb";
let tasks: typeof import("../lib/repos/tasks");
let days: typeof import("../lib/repos/days");
beforeAll(async () => { useTempDb(); tasks = await import("../lib/repos/tasks"); days = await import("../lib/repos/days"); });

describe("tasks repo", () => {
  it("creates tasks and recomputes day pomodoros from actual", () => {
    const a = tasks.createTask("2026-11-01", "A", 3);
    const b = tasks.createTask("2026-11-01", "B", 2);
    tasks.updateTask(a.id, { actual: 4 });
    tasks.updateTask(b.id, { actual: 1 });
    expect(days.getDay("2026-11-01")!.pomodoros).toBe(5);
    const list = tasks.listTasks("2026-11-01");
    expect(list.map((t) => t.title)).toEqual(["A", "B"]);
  });
  it("delete recomputes; last delete leaves pomodoros 0", () => {
    const t = tasks.createTask("2026-11-02", "only", 1);
    tasks.updateTask(t.id, { actual: 3 });
    expect(days.getDay("2026-11-02")!.pomodoros).toBe(3);
    tasks.deleteTask(t.id);
    expect(days.getDay("2026-11-02")!.pomodoros).toBe(0);
    expect(tasks.listTasks("2026-11-02")).toEqual([]);
  });
  it("toggles done", () => {
    const t = tasks.createTask("2026-11-03", "x", 1);
    expect(tasks.updateTask(t.id, { done: 1 }).done).toBe(1);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npm test -- tasks-repo`

- [ ] **Step 3: Implement** — `lib/repos/tasks.ts` с prepared statements (см. interfaces). `recomputePomodoros` в `days.ts`:
```ts
export function recomputePomodoros(date: string): void {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(actual),0) s FROM tasks WHERE date = ?").get(date) as { n: number; s: number };
  if (row.n === 0) return;
  const existing = getDay(date);
  const updated_at = new Date().toISOString();
  if (existing) {
    db.prepare("UPDATE days SET pomodoros = ?, updated_at = ? WHERE date = ?").run(row.s, updated_at, date);
  } else {
    db.prepare("INSERT INTO days (date, pomodoros, updated_at) VALUES (?,?,?)").run(date, row.s, updated_at);
  }
}
```
`createTask` при отсутствии дня делает `upsertDay(date, {})` до вставки задачи.

- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: tasks repository with day pomodoro recompute"`

---

## Task 5: API задач + расширенный PUT дня

**Files:**
- Create: `app/api/days/[date]/tasks/route.ts` (GET, POST)
- Create: `app/api/tasks/[id]/route.ts` (PUT, DELETE)
- Modify: `app/api/days/[date]/route.ts` (PUT — новые поля; игнор `pomodoros` при наличии задач)
- Test: `test/tasks-api.test.ts` (вызов хендлеров напрямую с мок-Request)

**Interfaces:**
- Consumes: `lib/repos/tasks`, `lib/validate`.
- Produces: HTTP-контракты из spec. POST с пустым `title` → 400.

- [ ] **Step 1: Failing test** — `test/tasks-api.test.ts` (импорт route-хендлеров, вызов с `new Request(...)`; проверка 400 на пустом title, 200 на валидном, пересчёт дня).
```ts
import { beforeAll, describe, it, expect } from "vitest";
import { useTempDb } from "./helpers/testdb";
let POST: typeof import("../app/api/days/[date]/tasks/route").POST;
beforeAll(async () => { useTempDb(); ({ POST } = await import("../app/api/days/[date]/tasks/route")); });

function req(body: unknown) {
  return new Request("http://x", { method: "POST", body: JSON.stringify(body) });
}
describe("POST task", () => {
  it("rejects empty title with 400", async () => {
    const res = await POST(req({ title: "  ", planned: 1 }), { params: Promise.resolve({ date: "2026-12-01" }) });
    expect(res.status).toBe(400);
  });
  it("creates task 200", async () => {
    const res = await POST(req({ title: "task", planned: 2 }), { params: Promise.resolve({ date: "2026-12-01" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.title).toBe("task");
  });
});
```
(Next 15 передаёт `params` как Promise — хендлер делает `const { date } = await ctx.params`.)

- [ ] **Step 2: Run, verify fail** — `npm test -- tasks-api`

- [ ] **Step 3: Implement** — три route-файла. Паттерн ответа/валидации копировать из существующего `app/api/days/[date]/route.ts`. В PUT дня: после загрузки задач, если `listTasks(date).length > 0` — удалить `pomodoros` из patch. Применить `parseTitle/parsePomodoros/parseBool/parseQuality/parseText`; при любом `undefined` → 400.

- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: tasks API routes + extended day PUT"`

---

## Task 6: UI редактора дня

**Files:**
- Create: `components/TaskList.tsx`
- Modify: `components/DayEditor.tsx`
- Test: вручную (UI) — см. Step с проверкой `npm run build`.

**Interfaces:**
- Consumes: `/api/days/[date]/tasks`, `/api/tasks/[id]`, расширенный PUT дня.

- [ ] **Step 1:** `TaskList.tsx` — загружает задачи даты, рендерит строки `title | planned | actual | ✓ | ✕`, кнопка «+ задача», автосохранение изменений через PUT/POST/DELETE, внизу итог `план N → факт M` с подсветкой (actual>planned оранжевый, actual<planned emerald). Инлайновые fetch как в `DayEditor`.
- [ ] **Step 2:** `DayEditor.tsx` — добавить `<TaskList date={date} />` сверху; ручной ввод `pomodoros` показывать только если задач нет (состояние `hasTasks`). Добавить менталку (`QualityPicker` + textarea), три textarea (mistakes/wins/conclusions вместо `review`), тогл `social`. Обновить `save()` body и загрузку полей. Убрать старое поле `review` из формы.
- [ ] **Step 3:** `npm run build` — компиляция без ошибок TS.
- [ ] **Step 4: Manual check** — запустить `npm run dev`, открыть день: добавить задачу (plan 3), выставить факт 4 → итог подсвечен «медленнее»; заполнить 3 поля, менталку, тогл; перезагрузить — данные на месте.
- [ ] **Step 5: Commit** — `git commit -m "feat: day editor with tasks, mental scale, 3-field review, social toggle"`

---

## Task 7: План на завтра

**Files:**
- Modify: `components/Nav.tsx` (ссылка «План на завтра»)
- Create: `app/plan/page.tsx` (рендерит `DayEditor` для `addDays(today, 1)`)

**Interfaces:**
- Consumes: `lib/dates.addDays`, `toISODate`, `DayEditor`.

- [ ] **Step 1:** `app/plan/page.tsx` — считает завтрашнюю дату, рендерит заголовок «План на завтра (дата)» + `<DayEditor date={tomorrow} />`.
- [ ] **Step 2:** добавить ссылку в `Nav.tsx`.
- [ ] **Step 3:** `npm run build` → OK; dev-проверка: завести задачу на завтра, открыть завтрашний день — задача там.
- [ ] **Step 4: Commit** — `git commit -m "feat: plan-tomorrow entry point"`

---

## Task 8: LLM-модуль + API сводок + UI недели/месяца

**Files:**
- Create: `lib/llm.ts`
- Create: `app/api/weekly/[weekStart]/summary/route.ts`
- Create: `app/api/monthly/[month]/summary/route.ts`
- Modify: формы ревью недели/месяца (`app/reviews/page.tsx` и/или `components/ReviewForm.tsx`)
- Modify: `package.json` (+`@anthropic-ai/sdk`)
- Test: `test/llm.test.ts`

**Interfaces:**
- Produces:
  - `splitReview(text: string): Promise<{ mistakes: string; wins: string; conclusions: string }>`
  - `summarizeReviews(days: Array<{ date: string; mistakes: string | null; wins: string | null; conclusions: string | null }>): Promise<{ mistakes: string; wins: string; conclusions: string }>`
  - обе читают `process.env.ANTHROPIC_API_KEY`; при отсутствии — `throw new Error("ANTHROPIC_API_KEY не задан")`.
  - структурированный вывод через tool use; при невалидном JSON в `splitReview` — fallback `{mistakes:"",wins:"",conclusions:text}`.

- [ ] **Step 1:** `npm i @anthropic-ai/sdk`.
- [ ] **Step 2: Failing test** — `test/llm.test.ts`: замокать SDK (`vi.mock("@anthropic-ai/sdk")`), проверить что `splitReview` парсит tool-результат в 3 поля и что при битом ответе срабатывает fallback (text → conclusions). Проверить throw без ключа.
- [ ] **Step 3: Run, verify fail** — `npm test -- llm`.
- [ ] **Step 4: Implement** `lib/llm.ts` — перед написанием свериться со skill `claude-api` (id модели `claude-haiku-4-5-20251001`, формат tool use / structured output). Клиент создаётся лениво внутри функций.
- [ ] **Step 5:** summary route-файлы: собрать дни периода (`getDaysInRange`), вызвать `summarizeReviews`, сохранить 3 поля в `weekly_reviews`/`monthly_reviews`, вернуть обновлённую запись. Ошибку LLM/ключа → 500 с `{error}`.
- [ ] **Step 6:** UI недели/месяца: убрать textarea `review`, показать 3 поля (read-only), кнопка «Сгенерировать сводку» с состояниями idle/loading/ok/error; `quality` и `plan` остаются редактируемыми.
- [ ] **Step 7: Run tests** `npm test -- llm` → PASS; `npm run build` → OK.
- [ ] **Step 8: Commit** — `git commit -m "feat: LLM summaries for weekly/monthly reviews"`

---

## Task 9: Разовая миграция старого ревью

**Files:**
- Create: `scripts/migrate-reviews.ts`
- Test: `test/migrate-reviews.test.ts`

**Interfaces:**
- Consumes: `lib/repos/days`, `lib/llm.splitReview`.
- Produces: `migrateReviews(split = splitReview): Promise<{ migrated: number; skipped: number }>` — обрабатывает дни где `review` непуст и все три новых поля пусты; пишет результат; идемпотентна.

- [ ] **Step 1: Failing test** — `test/migrate-reviews.test.ts`: temp DB, вставить 2 дня с `review`, один уже с заполненными полями; замокать `split`; проверить что мигрируется только один, повторный запуск → migrated 0.
- [ ] **Step 2: Run, verify fail** — `npm test -- migrate-reviews`.
- [ ] **Step 3: Implement** `migrateReviews` в `scripts/migrate-reviews.ts` + CLI-обёртка (`if (require.main === module)`), которая гонит по реальной `data.db`.
- [ ] **Step 4: Run tests** → PASS.
- [ ] **Step 5: Прогон на реальных данных** — сделать бэкап `data.db` (`/api/backup` или копия файла), затем `npx tsx scripts/migrate-reviews.ts`, проверить несколько дней в UI.
- [ ] **Step 6: Commit** — `git commit -m "feat: one-off migration of legacy day reviews into 3 fields"`

---

## Финал
- [ ] `npm test` — все тесты зелёные.
- [ ] `npm run build` — без ошибок.
- [ ] Ручная проверка ключевых сценариев (план дня, план на завтра, сводка недели).
- [ ] Code review перед мержем (skill requesting-code-review).
