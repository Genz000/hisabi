-- Monthly items: things to buy at most N times a month (e.g. 4 Kinder Bueno),
-- each in a category, with an optional price. Every purchase is one item_logs row.
CREATE TABLE public.items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (btrim(name) <> ''),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  monthly_target integer NOT NULL CHECK (monthly_target BETWEEN 1 AND 999),
  price numeric CHECK (price IS NULL OR price >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own items"
  ON public.items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own items"
  ON public.items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own items"
  ON public.items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own items"
  ON public.items FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_items_user_id ON public.items(user_id);

-- One row per purchase. transaction_id points at the expense logged with it
-- when the item has a price; no foreign key, because that expense may still be
-- waiting to sync from the phone.
CREATE TABLE public.item_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  date date NOT NULL,
  transaction_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.item_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own item logs"
  ON public.item_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own item logs"
  ON public.item_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own item logs"
  ON public.item_logs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_item_logs_user_date ON public.item_logs(user_id, date);
