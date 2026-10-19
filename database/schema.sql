-- Supabase schema for the Travel Itinerary Planner.

create table if not exists public.users (
    id uuid primary key references auth.users (id) on delete cascade,
    email text unique,
    full_name text,
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.trips (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users (id) on delete cascade,
    title text not null check (char_length(trim(title)) > 0),
    destination text not null check (char_length(trim(destination)) > 0),
    start_date date,
    end_date date,
    budget numeric(12, 2) check (budget is null or budget >= 0),
    currency text not null default 'USD'
        check (currency ~ '^[A-Z]{3}$'),
    status text not null default 'planned'
        check (status in ('planned', 'upcoming', 'completed', 'cancelled')),
    notes text,
    num_travelers integer not null default 1 check (num_travelers >= 1),
    interests text[] not null default '{}',
    dietary_needs text[] not null default '{}',
    travel_pace text not null default 'moderate'
        check (travel_pace in ('relaxed', 'moderate', 'fast')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (
        start_date is null
        or end_date is null
        or end_date >= start_date
    )
);

alter table public.trips
    add column if not exists num_travelers integer not null default 1
        check (num_travelers >= 1);
alter table public.trips
    add column if not exists interests text[] not null default '{}';
alter table public.trips
    add column if not exists dietary_needs text[] not null default '{}';
alter table public.trips
    add column if not exists travel_pace text not null default 'moderate'
        check (travel_pace in ('relaxed', 'moderate', 'fast'));

create table if not exists public.itineraries (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users (id) on delete cascade,
    trip_id uuid not null references public.trips (id) on delete cascade,
    title text not null check (char_length(trim(title)) > 0),
    description text,
    location text,
    starts_at timestamptz,
    ends_at timestamptz,
    category text,
    sort_order integer not null default 0 check (sort_order >= 0),
    estimated_cost numeric(12, 2)
        check (estimated_cost is null or estimated_cost >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (
        starts_at is null
        or ends_at is null
        or ends_at >= starts_at
    )
);

create table if not exists public.preferences (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references public.users (id) on delete cascade,
    settings jsonb not null default '{}'::jsonb
        check (jsonb_typeof(settings) = 'object'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.saved_places (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users (id) on delete cascade,
    name text not null check (char_length(trim(name)) > 0),
    description text,
    address text,
    category text,
    external_place_id text,
    latitude double precision check (latitude is null or latitude between -90 and 90),
    longitude double precision check (longitude is null or longitude between -180 and 180),
    created_at timestamptz not null default now()
);

create table if not exists public.history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users (id) on delete cascade,
    trip_id uuid references public.trips (id) on delete set null,
    event_type text not null check (char_length(trim(event_type)) > 0),
    details jsonb not null default '{}'::jsonb
        check (jsonb_typeof(details) = 'object'),
    created_at timestamptz not null default now()
);

create index if not exists trips_user_id_idx
    on public.trips (user_id);
create index if not exists itineraries_user_trip_order_idx
    on public.itineraries (user_id, trip_id, sort_order, starts_at);
create index if not exists saved_places_user_id_idx
    on public.saved_places (user_id);
create index if not exists history_user_created_at_idx
    on public.history (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.users (id, email, full_name, avatar_url)
    values (
        new.id,
        new.email,
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
    before update on public.users
    for each row execute function public.set_updated_at();

drop trigger if exists set_trips_updated_at on public.trips;
create trigger set_trips_updated_at
    before update on public.trips
    for each row execute function public.set_updated_at();

drop trigger if exists set_itineraries_updated_at on public.itineraries;
create trigger set_itineraries_updated_at
    before update on public.itineraries
    for each row execute function public.set_updated_at();

drop trigger if exists set_preferences_updated_at on public.preferences;
create trigger set_preferences_updated_at
    before update on public.preferences
    for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.itineraries enable row level security;
alter table public.preferences enable row level security;
alter table public.saved_places enable row level security;
alter table public.history enable row level security;

revoke all on table
    public.users,
    public.trips,
    public.itineraries,
    public.preferences,
    public.saved_places,
    public.history
from anon, authenticated;

grant select on table public.users to authenticated;
grant update (full_name, avatar_url) on table public.users to authenticated;
grant select, insert, update, delete
    on table public.trips, public.itineraries, public.preferences, public.saved_places
    to authenticated;
grant select, insert on table public.history to authenticated;

drop policy if exists "Users can read their own profile" on public.users;
create policy "Users can read their own profile"
    on public.users for select
    to authenticated
    using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
    on public.users for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

drop policy if exists "Users can manage their own trips" on public.trips;
create policy "Users can manage their own trips"
    on public.trips for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own itineraries" on public.itineraries;
create policy "Users can manage their own itineraries"
    on public.itineraries for all
    to authenticated
    using (
        (select auth.uid()) = user_id
        and exists (
            select 1
            from public.trips
            where trips.id = itineraries.trip_id
              and trips.user_id = (select auth.uid())
        )
    )
    with check (
        (select auth.uid()) = user_id
        and exists (
            select 1
            from public.trips
            where trips.id = itineraries.trip_id
              and trips.user_id = (select auth.uid())
        )
    );

drop policy if exists "Users can manage their own preferences" on public.preferences;
create policy "Users can manage their own preferences"
    on public.preferences for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own saved places" on public.saved_places;
create policy "Users can manage their own saved places"
    on public.saved_places for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own history" on public.history;
create policy "Users can read their own history"
    on public.history for select
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can add to their own history" on public.history;
create policy "Users can add to their own history"
    on public.history for insert
    to authenticated
    with check (
        (select auth.uid()) = user_id
        and (
            trip_id is null
            or exists (
                select 1
                from public.trips
                where trips.id = history.trip_id
                  and trips.user_id = (select auth.uid())
            )
        )
    );
