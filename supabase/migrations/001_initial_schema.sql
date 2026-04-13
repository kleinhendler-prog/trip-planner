-- Initial schema for Trip Planner app
-- Creates all tables with RLS (Row-Level Security) policies

-- Create trips table
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  destination jsonb NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  profile jsonb NOT NULL,
  itinerary jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'failed')),
  weather_tier text,
  weather_data jsonb,
  currency text DEFAULT 'EUR',
  daily_budget_target numeric,
  inbound_email_token text UNIQUE,
  booked_items jsonb DEFAULT '[]',
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Create places_cache table
CREATE TABLE public.places_cache (
  place_id text PRIMARY KEY,
  data jsonb NOT NULL,
  fetched_at timestamptz DEFAULT now()
);

-- Create generation_jobs table
CREATE TABLE public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  step text NOT NULL,
  status text NOT NULL,
  error text,
  updated_at timestamptz DEFAULT now()
);

-- Create trip_confirmations table
CREATE TABLE public.trip_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('flight', 'hotel', 'rental', 'activity')),
  data jsonb NOT NULL,
  raw_email text,
  received_at timestamptz DEFAULT now(),
  matched_activity_id text
);

-- Create trip_reflections table
CREATE TABLE public.trip_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  loved jsonb,
  disappointed jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(trip_id)
);

-- Create user_preferences table
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  preference text NOT NULL,
  source_reflection_id uuid REFERENCES public.trip_reflections(id),
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

-- Create destination_sources table
CREATE TABLE public.destination_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_key text NOT NULL,
  audience_type text NOT NULL,
  domain text NOT NULL,
  source_name text NOT NULL,
  focus text,
  trust_rating text DEFAULT 'medium' CHECK (trust_rating IN ('high', 'medium', 'low')),
  added_at timestamptz DEFAULT now(),
  added_by text DEFAULT 'seeded' CHECK (added_by IN ('seeded', 'user_approved', 'auto_proposed')),
  upvotes int DEFAULT 0,
  downvotes int DEFAULT 0,
  active boolean DEFAULT true,
  UNIQUE(destination_key, audience_type, domain)
);

-- Enable RLS on all tables
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trips table
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT
  USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can create their own trips"
  ON public.trips FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can update their own trips"
  ON public.trips FOR UPDATE
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can delete their own trips"
  ON public.trips FOR DELETE
  USING (user_id = current_setting('app.user_id', true));

-- RLS Policies for generation_jobs table
CREATE POLICY "Users can view generation jobs for their trips"
  ON public.generation_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = generation_jobs.trip_id
      AND trips.user_id = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "Users can insert generation jobs for their trips"
  ON public.generation_jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = generation_jobs.trip_id
      AND trips.user_id = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "Users can update generation jobs for their trips"
  ON public.generation_jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = generation_jobs.trip_id
      AND trips.user_id = current_setting('app.user_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = generation_jobs.trip_id
      AND trips.user_id = current_setting('app.user_id', true)
    )
  );

-- RLS Policies for trip_confirmations table
CREATE POLICY "Users can view confirmations for their trips"
  ON public.trip_confirmations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_confirmations.trip_id
      AND trips.user_id = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "Users can insert confirmations for their trips"
  ON public.trip_confirmations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_confirmations.trip_id
      AND trips.user_id = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "Users can update confirmations for their trips"
  ON public.trip_confirmations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_confirmations.trip_id
      AND trips.user_id = current_setting('app.user_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_confirmations.trip_id
      AND trips.user_id = current_setting('app.user_id', true)
    )
  );

-- RLS Policies for trip_reflections table
CREATE POLICY "Users can view reflections for their trips"
  ON public.trip_reflections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_reflections.trip_id
      AND trips.user_id = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "Users can insert reflections for their trips"
  ON public.trip_reflections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_reflections.trip_id
      AND trips.user_id = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "Users can update reflections for their trips"
  ON public.trip_reflections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_reflections.trip_id
      AND trips.user_id = current_setting('app.user_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_reflections.trip_id
      AND trips.user_id = current_setting('app.user_id', true)
    )
  );

-- RLS Policies for user_preferences table
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can create their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can delete their own preferences"
  ON public.user_preferences FOR DELETE
  USING (user_id = current_setting('app.user_id', true));

-- RLS Policies for places_cache table (shared cache, readable by all authenticated users)
CREATE POLICY "Authenticated users can view places cache"
  ON public.places_cache FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert places cache"
  ON public.places_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update places cache"
  ON public.places_cache FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for destination_sources table (shared registry)
CREATE POLICY "Authenticated users can view destination sources"
  ON public.destination_sources FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert destination sources"
  ON public.destination_sources FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update destination sources"
  ON public.destination_sources FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete destination sources"
  ON public.destination_sources FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_generation_jobs_trip_id ON public.generation_jobs(trip_id);
CREATE INDEX idx_trip_confirmations_trip_id ON public.trip_confirmations(trip_id);
CREATE INDEX idx_places_cache_fetched_at ON public.places_cache(fetched_at);
CREATE INDEX idx_destination_sources_destination_key_audience_type ON public.destination_sources(destination_key, audience_type);
