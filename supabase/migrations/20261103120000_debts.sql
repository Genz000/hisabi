-- Debts both ways: money I borrowed (I owe) and money I lent (owed to me).
-- Repayments are separate rows, so a debt can be paid back bit by bit.
CREATE TABLE public.debts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  person text NOT NULL CHECK (btrim(person) <> ''),
  direction text NOT NULL CHECK (direction IN ('borrowed', 'lent')),
  amount numeric NOT NULL CHECK (amount > 0),
  note text,
  date date NOT NULL,
  due_date date,
  -- Whether the money went through my balance (cash or account) when it happened
  affects_balance boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own debts"
  ON public.debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own debts"
  ON public.debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own debts"
  ON public.debts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own debts"
  ON public.debts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_debts_updated_at
BEFORE UPDATE ON public.debts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_debts_user_id ON public.debts(user_id);

CREATE TABLE public.debt_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own debt payments"
  ON public.debt_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own debt payments"
  ON public.debt_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own debt payments"
  ON public.debt_payments FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_debt_payments_debt_id ON public.debt_payments(debt_id);
