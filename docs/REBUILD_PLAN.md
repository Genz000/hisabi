# Hisabi rebuild plan

Handoff brief for Claude Code. Repo: https://github.com/Genz000/hisabi (Vite + React + TypeScript + shadcn/ui + Supabase, originally built with Lovable).

## Why we're rebuilding

The owner (Nader, iPhone user, Morocco, pays with cash + Apple Pay + card) used the app for a while and then stopped logging. Root cause from the ideation work: **logging needed a PC and a login**, so every expense had to survive in memory until he sat at a computer. Manual entry is fine and wanted (categories + per-category limits matter), but it must take ~5 seconds on the phone.

Goal: a phone-first PWA where logging an expense is **type amount → tap category → done**, and the app tells you how much is left right after.

## Decisions already made

- **Platform:** PWA installed to the iPhone Home Screen. Keep it usable on desktop too.
- **Input:** manual. No bank/Apple Pay automation for now.
- **Backend:** keep the existing Supabase project (`lcqndvxtossbrdqxumbc`), owner has access. Keep all existing data.
- **Hosting:** Netlify.
- **Code:** GitHub `Genz000/hisabi`. Lovable may still be linked to this repo; avoid editing in Lovable while rebuilding.
- **Currency:** MAD by default (currently hardcoded `$`).

## Current state (what's in the code)

- `src/pages/Index.tsx` (480 lines): one big dashboard page. Balance cards, chart, category breakdown, transaction list, avatar menu.
- `src/components/TransactionForm.tsx`: 5-field form in a dialog (type, amount, category select, date, description). Too slow on a phone.
- `src/components/ExpenseLimitModal.tsx`: per-category monthly limits, saved to `expense_limits` (user_id, category, limit_amount).
- **Categories are hardcoded twice** (form + limits modal): Food, Sport, Health/medical, Home, Transportation, Hajar, Gifts, Utilities, Travel, Others, Nader. Income: Savings, Paycheck, Bonus, Freelancing, Other.
- `startingBalance = 99080` hardcoded in `Index.tsx`.
- Dates use `new Date().toISOString().split("T")[0]`, which is UTC and can land on the wrong day near midnight. Use local date (date-fns `format(new Date(), "yyyy-MM-dd")`).
- Tables: `transactions` (category as TEXT), `expense_limits`, `profiles` (avatar_url), plus an `avatars` storage bucket. RLS on all.

## Build phases

Do these in order, and get each one working on a phone before starting the next.

### Phase 1: Data foundation
1. New migration: `categories` table: `id, user_id, name, icon (text, lucide name or emoji), kind ('expense'|'income'), monthly_limit numeric null, sort_order int, archived bool default false, created_at, updated_at`. Unique `(user_id, name, kind)`. RLS like the other tables.
2. Backfill: for each existing user, insert the hardcoded categories, copying `monthly_limit` from `expense_limits`, and add any category names found in `transactions` that aren't in the list.
3. Keep `transactions.category` as TEXT (matches `categories.name`). Renaming a category must also update that user's transactions (one RPC or two updates).
4. Add to `profiles`: `currency text default 'MAD'`, `starting_balance numeric default 0`. Move the 99080 into Nader's profile row instead of code.
5. Keep `expense_limits` until everything reads from `categories`, then drop it in a later migration.
6. Regenerate `src/integrations/supabase/types.ts`.

### Phase 2: Quick-add screen (the core of the rebuild)
- The app opens **directly** to quick-add after login. No dashboard first.
- Big amount display + custom number pad (don't rely on the iOS keyboard; avoid input zoom).
- Grid of category buttons below, **sorted by usage frequency over the last 60 days**, then sort_order. Expense categories by default; small toggle for income.
- **Tapping a category saves immediately.** No Save button. Date = today (local). Optional note + date change behind a small "more" affordance, never required.
- After save: confirmation showing `{category}: {amount} logged · {remaining} left this month` (or "over by X"), with **Undo** for ~5 seconds.
- Optimistic insert; handle offline/failure clearly (keep the amount, show retry).
- Must work one-handed: primary controls in the bottom half of the screen.

### Phase 3: Categories & limits with pace
- Category list view: each row shows spent / limit and a progress bar with a **"today" marker** (day-of-month ÷ days-in-month).
- States: on track, ≥80% of limit, over limit. Clear but not alarming.
- Top of the screen: total "left this month" across limited categories, plus **"safe to spend per day"** = remaining ÷ days left.
- Manage categories: add, rename, reorder, set limit, archive, pick an icon. Replaces `ExpenseLimitModal`.

### Phase 4: PWA + deploy
- Web app manifest (name "Hisabi", standalone display, theme color, icons incl. 180×180 `apple-touch-icon`), iOS meta tags (`apple-mobile-web-app-capable`, status bar style), `viewport-fit=cover` + safe-area padding.
- Service worker via `vite-plugin-pwa` for app-shell caching (no stale data caching for Supabase calls).
- Supabase session already persists in localStorage, so the app stays logged in once installed.
- Netlify: build `npm run build`, publish `dist`, SPA redirect (`public/_redirects`: `/* /index.html 200`), env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
- Add the Netlify URL to Supabase Auth → URL configuration (Site URL + redirect URLs).
- Test on the real iPhone: Safari → Share → Add to Home Screen.

### Phase 5: Habit safety nets
- **"Nothing today" check-in:** a button on quick-add that records a check-in for the day (small `check_ins` table: user_id, date). Show a simple streak of days *checked in* (logging or "nothing" both count).
- **Weekly reconciliation (Sunday):** prompt "How much do you have now (cash + bank)?". Compare to the computed balance and insert the difference as an expense in an **"Untracked"** category. Missed entries never break the totals.
- **Evening reminder:** don't build web push. Use an iOS Shortcuts personal automation (daily at 21:30 → open the Hisabi URL). Document the setup steps in the README.

### Later / keep as-is
- Existing dashboard pieces (chart, breakdown, transaction list with edit/delete) move to a secondary "History" tab. Restyle, don't delete.
- Avatar upload can stay but shouldn't be in the main flow.

## Definition of done
- From the Home Screen icon, logging a 45 MAD Food expense takes ≤ 3 taps after the amount and < 5 seconds.
- Every save shows the category's remaining amount.
- All historical transactions and limits still present and correct.
- Works offline-tolerant (failed save is never silently lost).
- Deployed on Netlify, installed on the iPhone, still logged in after closing and reopening.
