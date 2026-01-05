-- Create table for storing push notification tokens
create table if not exists public.user_push_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, platform)
);

-- Enable RLS
alter table public.user_push_tokens enable row level security;

-- Create policies (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_push_tokens'
      AND policyname = 'Users can view their own tokens'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view their own tokens" ON public.user_push_tokens';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_push_tokens'
      AND policyname = 'Users can insert their own tokens'
  ) THEN
    EXECUTE 'DROP POLICY "Users can insert their own tokens" ON public.user_push_tokens';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_push_tokens'
      AND policyname = 'Users can update their own tokens'
  ) THEN
    EXECUTE 'DROP POLICY "Users can update their own tokens" ON public.user_push_tokens';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_push_tokens'
      AND policyname = 'Users can delete their own tokens'
  ) THEN
    EXECUTE 'DROP POLICY "Users can delete their own tokens" ON public.user_push_tokens';
  END IF;
END $$;

create policy "Users can view their own tokens"
  on public.user_push_tokens
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own tokens"
  on public.user_push_tokens
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tokens"
  on public.user_push_tokens
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own tokens"
  on public.user_push_tokens
  for delete
  using (auth.uid() = user_id);

-- Create indexes for faster lookups
create index if not exists idx_user_push_tokens_user_id on public.user_push_tokens(user_id);
create index if not exists idx_user_push_tokens_platform on public.user_push_tokens(platform);

-- Add comment
comment on table public.user_push_tokens is 'Stores push notification tokens for mobile devices';

-- Function to send push notification via Edge Function
create or replace function notify_push(
  p_user_ids uuid[] default null,
  p_role text default null,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_request_id bigint;
begin
  -- Call Edge Function asynchronously using pg_net extension
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'user_ids', p_user_ids,
      'role', p_role,
      'title', p_title,
      'body', p_body,
      'data', p_data
    )
  ) into v_request_id;
  
  -- Log the notification (optional)
  raise notice 'Push notification queued with request_id: %', v_request_id;
exception
  when others then
    -- Don't fail the transaction if notification fails
    raise warning 'Failed to send push notification: %', sqlerrm;
end;
$$;

-- Trigger function: Notify drivers when new order is created
create or replace function notify_new_order()
returns trigger
language plpgsql
security definer
as $$
declare
  v_company_name text;
  v_pickup_address text;
begin
  -- Only notify if order is in 'pending' status
  if new.status = 'pending' then
    -- Get company name
    select p.name into v_company_name
    from profiles p
    where p.id = new.company_user_id;
    
    -- Get pickup address
    v_pickup_address := coalesce(new.pickup_address, 'Endereço não informado');
    
    -- Send notification to all drivers
    perform notify_push(
      p_role := 'driver',
      p_title := '🚀 Novo Pedido Disponível!',
      p_body := v_company_name || ' - ' || v_pickup_address,
      p_data := jsonb_build_object(
        'type', 'new_order',
        'order_id', new.id::text,
        'action', 'open_available_orders'
      )
    );
  end if;
  
  return new;
end;
$$;

-- Trigger function: Notify company when order is accepted
create or replace function notify_order_accepted()
returns trigger
language plpgsql
security definer
as $$
declare
  v_driver_name text;
begin
  -- Only notify if status changed to 'accepted'
  if old.status != 'accepted' and new.status = 'accepted' and new.driver_user_id is not null then
    -- Get driver name
    select p.name into v_driver_name
    from profiles p
    where p.id = new.driver_user_id;
    
    -- Send notification to company
    perform notify_push(
      p_user_ids := array[new.company_user_id],
      p_title := '✅ Pedido Aceito!',
      p_body := v_driver_name || ' aceitou seu pedido',
      p_data := jsonb_build_object(
        'type', 'order_accepted',
        'order_id', new.id::text,
        'action', 'open_order_details'
      )
    );
  end if;
  
  return new;
end;
$$;

-- Trigger function: Notify company when order is collected
create or replace function notify_order_collected()
returns trigger
language plpgsql
security definer
as $$
declare
  v_driver_name text;
begin
  -- Only notify if status changed to 'collected'
  if old.status != 'collected' and new.status = 'collected' and new.driver_user_id is not null then
    -- Get driver name
    select p.name into v_driver_name
    from profiles p
    where p.id = new.driver_user_id;
    
    -- Send notification to company
    perform notify_push(
      p_user_ids := array[new.company_user_id],
      p_title := '📦 Pedido Coletado!',
      p_body := v_driver_name || ' coletou seu pedido e está a caminho',
      p_data := jsonb_build_object(
        'type', 'order_collected',
        'order_id', new.id::text,
        'action', 'open_order_details'
      )
    );
  end if;
  
  return new;
end;
$$;

-- Trigger function: Notify company when order is completed
create or replace function notify_order_completed()
returns trigger
language plpgsql
security definer
as $$
declare
  v_driver_name text;
begin
  -- Only notify if status changed to 'completed'
  if old.status != 'completed' and new.status = 'completed' and new.driver_user_id is not null then
    -- Get driver name
    select p.name into v_driver_name
    from profiles p
    where p.id = new.driver_user_id;
    
    -- Send notification to company
    perform notify_push(
      p_user_ids := array[new.company_user_id],
      p_title := '🎉 Pedido Concluído!',
      p_body := v_driver_name || ' finalizou a entrega',
      p_data := jsonb_build_object(
        'type', 'order_completed',
        'order_id', new.id::text,
        'action', 'open_order_details'
      )
    );
  end if;
  
  return new;
end;
$$;

-- Create triggers
drop trigger if exists trigger_notify_new_order on orders;
create trigger trigger_notify_new_order
  after insert on orders
  for each row
  execute function notify_new_order();

drop trigger if exists trigger_notify_order_accepted on orders;
create trigger trigger_notify_order_accepted
  after update on orders
  for each row
  execute function notify_order_accepted();

drop trigger if exists trigger_notify_order_collected on orders;
create trigger trigger_notify_order_collected
  after update on orders
  for each row
  execute function notify_order_collected();

drop trigger if exists trigger_notify_order_completed on orders;
create trigger trigger_notify_order_completed
  after update on orders
  for each row
  execute function notify_order_completed();

-- Grant necessary permissions
grant execute on function notify_push to authenticated;
grant execute on function notify_new_order to authenticated;
grant execute on function notify_order_accepted to authenticated;
grant execute on function notify_order_collected to authenticated;
grant execute on function notify_order_completed to authenticated;
