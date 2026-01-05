-- Add city/state support for profile and order separation

alter table public.company_profiles
  add column if not exists state text,
  add column if not exists city text;

alter table public.driver_profiles
  add column if not exists state text,
  add column if not exists city text;

alter table public.orders
  add column if not exists state text,
  add column if not exists city text;

-- Best-effort backfill for existing orders (keeps older pending orders visible)
do $$
begin
  update public.orders o
  set
    city = coalesce(o.city, cp.city),
    state = coalesce(o.state, cp.state)
  from public.company_profiles cp
  where cp.user_id = o.company_user_id
    and (o.city is null or o.state is null);
exception
  when others then
    raise notice 'Skipping orders backfill: %', sqlerrm;
end $$;

-- Helps query: pending orders by city
create index if not exists orders_status_city_idx
  on public.orders (status, city);
