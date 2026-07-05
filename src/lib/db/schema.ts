/**
 * Drizzle schema — source of truth for the Neon Postgres database.
 * Reconstructed 2026-07-04 from actual code usage (the old supabase/migrations
 * folder had drifted from what the app really reads and writes).
 *
 * Property names intentionally match column names (snake_case) so row objects
 * keep the exact shape the app has always passed around.
 */

import {
  pgTable,
  text,
  uuid,
  date,
  jsonb,
  boolean,
  timestamp,
  integer,
  doublePrecision,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: text('user_id').notNull(),
    destination: jsonb('destination').notNull(),
    start_date: date('start_date').notNull(),
    end_date: date('end_date').notNull(),
    profile: jsonb('profile').notNull(),
    itinerary: jsonb('itinerary'),
    status: text('status').default('draft'),
    trip_type: text('trip_type').default('single_city'),
    trip_overrides: jsonb('trip_overrides').default({}),
    weather_tier: text('weather_tier'),
    weather_data: jsonb('weather_data'),
    currency: text('currency').default('EUR'),
    daily_budget_target: numeric('daily_budget_target'),
    inbound_email_token: text('inbound_email_token').unique(),
    email_confirmation_token: text('email_confirmation_token'),
    email_confirmed_at: timestamp('email_confirmed_at', { withTimezone: true }),
    booked_items: jsonb('booked_items').default([]),
    generation_started_at: timestamp('generation_started_at', { withTimezone: true }),
    generation_log: jsonb('generation_log').default([]),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_trips_user_id').on(t.user_id), index('idx_trips_status').on(t.status)]
);

export const user_profiles = pgTable('user_profiles', {
  user_id: text('user_id').primaryKey(),
  profile: jsonb('profile').notNull().default({}),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const user_preferences = pgTable(
  'user_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: text('user_id').notNull(),
    interests: jsonb('interests').default([]),
    dislikes: jsonb('dislikes').default([]),
    hotel_preference: text('hotel_preference'),
    pace: text('pace'),
    budget_level: text('budget_level'),
    meal_dietary_restrictions: jsonb('meal_dietary_restrictions').default([]),
    mobility_needs: text('mobility_needs'),
    active: boolean('active').default(true),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_user_preferences_user_id').on(t.user_id)]
);

export const destination_sources = pgTable(
  'destination_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    destination_key: text('destination_key').notNull(),
    audience_type: text('audience_type').notNull().default('general'),
    domain: text('domain'),
    source_name: text('source_name'),
    focus: text('focus'),
    content: text('content'),
    source_url: text('source_url'),
    trust_rating: text('trust_rating').default('medium'),
    added_at: timestamp('added_at', { withTimezone: true }).defaultNow(),
    added_by: text('added_by').default('seeded'),
    created_by: text('created_by'),
    upvotes: integer('upvotes').default(0),
    downvotes: integer('downvotes').default(0),
    active: boolean('active').default(true),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_destination_sources_key_audience').on(t.destination_key, t.audience_type),
  ]
);

export const trip_confirmations = pgTable(
  'trip_confirmations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trip_id: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    confirmed_by: text('confirmed_by'),
    confirmation_type: text('confirmation_type'),
    content: jsonb('content'),
    confirmed: boolean('confirmed').default(true),
    confirmed_at: timestamp('confirmed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_trip_confirmations_trip_id').on(t.trip_id)]
);

export const trip_reflections = pgTable(
  'trip_reflections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trip_id: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    user_id: text('user_id'),
    loved: jsonb('loved'),
    disappointed: jsonb('disappointed'),
    notes: text('notes'),
    extracted_preferences: jsonb('extracted_preferences'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex('uq_trip_reflections_trip_id').on(t.trip_id)]
);

export const generation_jobs = pgTable(
  'generation_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trip_id: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    step: text('step').notNull(),
    status: text('status').notNull(),
    progress: numeric('progress'),
    error: text('error'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_generation_jobs_trip_id').on(t.trip_id)]
);

export const places_cache = pgTable(
  'places_cache',
  {
    google_places_id: text('google_places_id').primaryKey(),
    name: text('name'),
    address: text('address'),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    place_type: text('place_type'),
    rating: doublePrecision('rating'),
    review_count: integer('review_count'),
    price_level: integer('price_level'),
    photos: jsonb('photos'),
    cached_at: timestamp('cached_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_places_cache_cached_at').on(t.cached_at)]
);

export const transit_cache = pgTable('transit_cache', {
  cache_key: text('cache_key').primaryKey(),
  duration_minutes: doublePrecision('duration_minutes'),
  distance_km: doublePrecision('distance_km'),
  cached_at: timestamp('cached_at', { withTimezone: true }).defaultNow(),
});
