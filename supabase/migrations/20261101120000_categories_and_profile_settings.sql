-- Phase 1 of docs/REBUILD_PLAN.md: data foundation.
-- Adds a per-user categories table (replacing the hardcoded lists), backfills it
-- from existing data, and moves currency/starting balance into profiles.
-- expense_limits is kept for now; it is dropped in a later migration.

-- Categories table
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text,
  kind text NOT NULL CHECK (kind IN ('expense', 'income')),
  monthly_limit numeric CHECK (monthly_limit IS NULL OR monthly_limit >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, name, kind)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categories"
  ON public.categories
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON public.categories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON public.categories
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON public.categories
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_categories_user_id ON public.categories(user_id);

-- Default categories (the lists previously hardcoded in TransactionForm and
-- ExpenseLimitModal). Icons are lucide icon names.
CREATE OR REPLACE FUNCTION public.seed_default_categories(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, icon, kind, sort_order)
  SELECT _user_id, d.name, d.icon, d.kind, d.sort_order
  FROM (VALUES
    ('Food',           'utensils',    'expense', 1),
    ('Sport',          'dumbbell',    'expense', 2),
    ('Health/medical', 'heart-pulse', 'expense', 3),
    ('Home',           'house',       'expense', 4),
    ('Transportation', 'car',         'expense', 5),
    ('Hajar',          'user',        'expense', 6),
    ('Gifts',          'gift',        'expense', 7),
    ('Utilities',      'zap',         'expense', 8),
    ('Travel',         'plane',       'expense', 9),
    ('Others',         'ellipsis',    'expense', 10),
    ('Nader',          'user',        'expense', 11),
    ('Savings',        'piggy-bank',  'income',  1),
    ('Paycheck',       'wallet',      'income',  2),
    ('Bonus',          'sparkles',    'income',  3),
    ('Freelancing',    'laptop',      'income',  4),
    ('Other',          'ellipsis',    'income',  5)
  ) AS d(name, icon, kind, sort_order)
  ON CONFLICT (user_id, name, kind) DO NOTHING;
END;
$$;

-- Only the signup trigger and this migration call it.
REVOKE EXECUTE ON FUNCTION public.seed_default_categories(uuid) FROM PUBLIC, anon, authenticated;

-- Backfill 1: defaults for every existing user
SELECT public.seed_default_categories(u.id) FROM auth.users u;

-- Backfill 2: category names used in transactions that aren't in the defaults
INSERT INTO public.categories (user_id, name, icon, kind, sort_order)
SELECT t.user_id, t.category, 'tag', t.type, 100
FROM public.transactions t
GROUP BY t.user_id, t.category, t.type
ON CONFLICT (user_id, name, kind) DO NOTHING;

-- Backfill 3: limits set for categories that exist in neither list above
INSERT INTO public.categories (user_id, name, icon, kind, sort_order)
SELECT el.user_id, el.category, 'tag', 'expense', 100
FROM public.expense_limits el
ON CONFLICT (user_id, name, kind) DO NOTHING;

-- Backfill 4: copy limits onto the expense categories
UPDATE public.categories c
SET monthly_limit = el.limit_amount
FROM public.expense_limits el
WHERE c.user_id = el.user_id
  AND c.name = el.category
  AND c.kind = 'expense';

-- New users get the default categories along with their profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (new.id);
  PERFORM public.seed_default_categories(new.id);
  RETURN new;
END;
$$;

-- Renaming a category also renames it on the user's transactions.
-- SECURITY INVOKER, so RLS limits both updates to the caller's rows.
CREATE OR REPLACE FUNCTION public.rename_category(_category_id uuid, _new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  _old_name text;
  _kind text;
BEGIN
  _new_name := btrim(_new_name);
  IF _new_name IS NULL OR _new_name = '' THEN
    RAISE EXCEPTION 'Category name cannot be empty';
  END IF;

  SELECT name, kind INTO _old_name, _kind
  FROM public.categories
  WHERE id = _category_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found';
  END IF;

  IF _old_name = _new_name THEN
    RETURN;
  END IF;

  UPDATE public.categories
  SET name = _new_name
  WHERE id = _category_id;

  UPDATE public.transactions
  SET category = _new_name
  WHERE user_id = auth.uid()
    AND category = _old_name
    AND type = _kind;

  -- Keep the legacy limits table in step until it is dropped
  IF _kind = 'expense' THEN
    UPDATE public.expense_limits
    SET category = _new_name
    WHERE user_id = auth.uid()
      AND category = _old_name;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rename_category(uuid, text) TO authenticated;

-- Per-user settings that were hardcoded in Index.tsx
ALTER TABLE public.profiles
  ADD COLUMN currency text NOT NULL DEFAULT 'MAD',
  ADD COLUMN starting_balance numeric NOT NULL DEFAULT 0;
