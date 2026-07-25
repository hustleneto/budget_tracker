-- =============================================================================
--  MyFinance — complete database schema
-- =============================================================================
--  Run this ONCE in the Supabase SQL Editor (Project → SQL Editor → New query)
--  when setting up a new project. It creates every table the app needs, the
--  access-control rules, and the default categories.
--
--  Safe to re-run: it will not duplicate data or error on existing objects.
--
--  Tables created:
--    allowed_users  — who is permitted to see this household's data
--    transactions   — every income/expense record
--    categories     — user-editable categories and businesses
--    budgets        — optional monthly limit per spending group
--    preferences    — household mode, names, feature toggles
-- =============================================================================


-- -----------------------------------------------------------------------------
--  1. ACCESS CONTROL  (read this section — it is the security of your data)
-- -----------------------------------------------------------------------------
--  Anyone can create an account through the app's sign-up form. That by itself
--  must NOT grant access to your money. So every table below is readable only
--  by people whose email address appears in `allowed_users`.
--
--  A stranger who signs up gets a valid login and an empty app. They see
--  nothing of yours.
--
--  To add your household: see the INSERT statement at the end of this section.
-- -----------------------------------------------------------------------------

create table if not exists allowed_users (
  email text primary key,
  added_at timestamptz not null default now()
);

alter table allowed_users enable row level security;
-- Deliberately no policies: this table is managed only from the SQL Editor,
-- so no logged-in user can read or modify the guest list from the browser.

-- Checks the current user's email against the allowlist. SECURITY DEFINER lets
-- it read allowed_users even though normal users cannot.
create or replace function is_allowed_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from allowed_users
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- Grandfather in every account that already exists, so an established setup
-- keeps working after running this file.
insert into allowed_users (email)
select email from auth.users
where email is not null
on conflict (email) do nothing;

-- ADD YOUR HOUSEHOLD HERE.
-- Uncomment and edit, then re-run just these lines:
--
-- insert into allowed_users (email) values
--   ('you@example.com'),
--   ('partner@example.com')
-- on conflict (email) do nothing;
--
-- To revoke access later:
--   delete from allowed_users where email = 'someone@example.com';


-- -----------------------------------------------------------------------------
--  2. TRANSACTIONS
-- -----------------------------------------------------------------------------
--  Note: "isShared" is intentionally camelCase and must stay quoted — the app
--  reads and writes that exact column name.

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  description text,
  "isShared" boolean not null default false,
  group_type text check (group_type in ('receita', 'essencial', 'lifestyle', 'investimento', 'negocio')),
  date timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  business_name text,
  paid_by text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_date_idx on transactions (date desc);
create index if not exists transactions_category_idx on transactions (category);

alter table transactions enable row level security;

drop policy if exists "Household can view transactions" on transactions;
create policy "Household can view transactions"
  on transactions for select to authenticated using (is_allowed_user());

drop policy if exists "Household can insert transactions" on transactions;
create policy "Household can insert transactions"
  on transactions for insert to authenticated with check (is_allowed_user());

drop policy if exists "Household can update transactions" on transactions;
create policy "Household can update transactions"
  on transactions for update to authenticated using (is_allowed_user());

drop policy if exists "Household can delete transactions" on transactions;
create policy "Household can delete transactions"
  on transactions for delete to authenticated using (is_allowed_user());


-- -----------------------------------------------------------------------------
--  3. CATEGORIES  (and businesses)
-- -----------------------------------------------------------------------------
--  A "business" is simply an Income category with is_business = true, so
--  renaming one in Settings updates it everywhere at once.

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '⭐',
  type text not null check (type in ('Income', 'Expense')),
  urgency text check (urgency in ('Essential', 'Lifestyle', 'Investment', 'Business') or urgency is null),
  is_business boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;

drop policy if exists "Household can view categories" on categories;
create policy "Household can view categories"
  on categories for select to authenticated using (is_allowed_user());

drop policy if exists "Household can insert categories" on categories;
create policy "Household can insert categories"
  on categories for insert to authenticated with check (is_allowed_user());

drop policy if exists "Household can update categories" on categories;
create policy "Household can update categories"
  on categories for update to authenticated using (is_allowed_user());

drop policy if exists "Household can delete categories" on categories;
create policy "Household can delete categories"
  on categories for delete to authenticated using (is_allowed_user());

-- Default categories. Only inserted when the table is completely empty, so
-- re-running this file never duplicates or overwrites your edits.
insert into categories (name, emoji, type, urgency, is_business, sort_order)
select * from (values
  ('Salário',            '💰', 'Income',  null,           false, 0),
  ('Investimentos',      '📈', 'Income',  null,           false, 1),
  ('Business #1',        '🏪', 'Income',  null,           true,  2),
  ('Business #2',        '🏬', 'Income',  null,           true,  3),
  ('Business #3',        '🏭', 'Income',  null,           true,  4),
  ('Outros Rendimentos', '👛', 'Income',  null,           false, 5),

  ('Habitação',          '🏠', 'Expense', 'Essential',    false, 0),
  ('Utilidades',         '⚡', 'Expense', 'Essential',    false, 1),
  ('Alimentação',        '🛒', 'Expense', 'Essential',    false, 2),
  ('Transporte',         '🚗', 'Expense', 'Essential',    false, 3),
  ('Saúde',              '🩺', 'Expense', 'Essential',    false, 4),
  ('Obrigações',         '🏛️', 'Expense', 'Essential',    false, 5),

  ('Restauração',        '🍽️', 'Expense', 'Lifestyle',    false, 0),
  ('Educação',           '📚', 'Expense', 'Lifestyle',    false, 1),
  ('Lazer',              '🎬', 'Expense', 'Lifestyle',    false, 2),
  ('Cuidado Pessoal',    '✨', 'Expense', 'Lifestyle',    false, 3),
  ('Doações',            '🎁', 'Expense', 'Lifestyle',    false, 4),
  ('Viagens',            '✈️', 'Expense', 'Lifestyle',    false, 5),

  ('Acções',             '📊', 'Expense', 'Investment',   false, 0),
  ('Criptos',            '🪙', 'Expense', 'Investment',   false, 1),
  ('Poupança',           '🐷', 'Expense', 'Investment',   false, 2),

  ('Matéria-Prima',      '📦', 'Expense', 'Business',     false, 0),
  ('Marketing',          '📣', 'Expense', 'Business',     false, 1),
  ('Apps',               '🌐', 'Expense', 'Business',     false, 2),
  ('Logística',          '🚚', 'Expense', 'Business',     false, 3),
  ('Equipamento',        '🔧', 'Expense', 'Business',     false, 4),
  ('Outros',             '➖', 'Expense', 'Business',     false, 5)
) as seed(name, emoji, type, urgency, is_business, sort_order)
where not exists (select 1 from categories);


-- -----------------------------------------------------------------------------
--  4. BUDGETS
-- -----------------------------------------------------------------------------
--  One optional monthly limit per spending group. Applied in Personal mode.

create table if not exists budgets (
  urgency text primary key check (urgency in ('Essential', 'Lifestyle', 'Investment', 'Business')),
  monthly_budget numeric,
  updated_at timestamptz not null default now()
);

alter table budgets enable row level security;

drop policy if exists "Household can view budgets" on budgets;
create policy "Household can view budgets"
  on budgets for select to authenticated using (is_allowed_user());

drop policy if exists "Household can insert budgets" on budgets;
create policy "Household can insert budgets"
  on budgets for insert to authenticated with check (is_allowed_user());

drop policy if exists "Household can update budgets" on budgets;
create policy "Household can update budgets"
  on budgets for update to authenticated using (is_allowed_user());


-- -----------------------------------------------------------------------------
--  5. PREFERENCES
-- -----------------------------------------------------------------------------
--  A single row holding the household setup, all editable in-app from
--  Settings → Preferências:
--    household_mode      'solo' (one person) or 'duo' (two people splitting)
--    partner_1/2_name    names shown on "who paid" and the settle-up card
--    businesses_enabled  show or hide the side-business features entirely

create table if not exists preferences (
  id integer primary key default 1,
  household_mode text not null default 'duo' check (household_mode in ('solo', 'duo')),
  partner_1_name text not null default 'Partner 1',
  partner_2_name text not null default 'Partner 2',
  businesses_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint preferences_single_row check (id = 1)
);

alter table preferences enable row level security;

drop policy if exists "Household can view preferences" on preferences;
create policy "Household can view preferences"
  on preferences for select to authenticated using (is_allowed_user());

drop policy if exists "Household can insert preferences" on preferences;
create policy "Household can insert preferences"
  on preferences for insert to authenticated with check (is_allowed_user());

drop policy if exists "Household can update preferences" on preferences;
create policy "Household can update preferences"
  on preferences for update to authenticated using (is_allowed_user());

insert into preferences (id) values (1) on conflict (id) do nothing;


-- =============================================================================
--  Done. Next steps:
--    1. Add your email(s) to allowed_users (section 1 above).
--    2. Create your account through the app's sign-up form.
--    3. Open Settings → Preferências and set up your household.
-- =============================================================================
