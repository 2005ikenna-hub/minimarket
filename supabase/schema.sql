create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  source_id integer,
  title text not null check (char_length(title) between 1 and 100),
  description text not null check (char_length(description) between 1 and 500),
  category text not null check (char_length(category) between 1 and 60),
  price numeric(10, 2) not null check (price >= 0),
  thumbnail text not null default '',
  rating numeric(3, 2) not null default 0 check (rating >= 0),
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now()
);

alter table public.products
  add column if not exists thumbnail text not null default '',
  add column if not exists rating numeric(3, 2) not null default 0,
  add column if not exists stock integer not null default 0;

alter table public.products
  add column if not exists source_id integer;

alter table public.products
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

alter table public.products
  drop constraint if exists products_source_id_key;

drop index if exists public.products_source_id_key;

create unique index if not exists products_owner_source_id_key
  on public.products (owner_id, source_id);

alter table public.products enable row level security;

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can add products" on public.products;
drop policy if exists "Authenticated users can add their own products" on public.products;
create policy "Authenticated users can add their own products"
  on public.products for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Public can update products" on public.products;
drop policy if exists "Authenticated users can update their own products" on public.products;
create policy "Authenticated users can update their own products"
  on public.products for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Public can delete products" on public.products;
drop policy if exists "Authenticated users can delete their own products" on public.products;
create policy "Authenticated users can delete their own products"
  on public.products for delete
  to authenticated
  using (owner_id = auth.uid());
