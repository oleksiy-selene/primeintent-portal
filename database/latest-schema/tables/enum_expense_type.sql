-- table: enum_expense_type
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.enum_expense_type (
  expense_type_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name            text NOT NULL,
  CONSTRAINT enum_expense_type_pkey PRIMARY KEY (expense_type_id),
  CONSTRAINT enum_expense_type_name_key UNIQUE (name)
);
