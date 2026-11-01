-- Daily check-ins: a day counts toward the streak when the user logged
-- something or tapped "Nothing spent today".
CREATE TABLE public.check_ins (
  user_id uuid NOT NULL,
  date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own check-ins"
  ON public.check_ins
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own check-ins"
  ON public.check_ins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own check-ins"
  ON public.check_ins
  FOR DELETE
  USING (auth.uid() = user_id);
