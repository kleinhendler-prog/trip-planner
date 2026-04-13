/**
 * Constants for Trip Planner Application
 * All static values, configuration, and enums
 */

import type { Interest, Dislike, HotelPreference, TripType, GenerationStep } from '@/types';

// ============= User Preferences =============

export const INTERESTS: Record<Interest, { label: string; icon: string }> = {
  hiking: { label: 'Hiking', icon: '🏔️' },
  museums: { label: 'Museums', icon: '🏛️' },
  beaches: { label: 'Beaches', icon: '🏖️' },
  nightlife: { label: 'Nightlife', icon: '🍸' },
  food: { label: 'Food & Cuisine', icon: '🍽️' },
  shopping: { label: 'Shopping', icon: '🛍️' },
  history: { label: 'History', icon: '📜' },
  art: { label: 'Art & Culture', icon: '🎨' },
  sports: { label: 'Sports', icon: '⚽' },
  nature: { label: 'Nature', icon: '🌿' },
  architecture: { label: 'Architecture', icon: '🏗️' },
  photography: { label: 'Photography', icon: '📸' },
  wellness: { label: 'Wellness & Spa', icon: '🧘' },
  adventure: { label: 'Adventure Sports', icon: '🪂' },
  music: { label: 'Live Music', icon: '🎵' },
};

export const DISLIKES: Record<Dislike, { label: string; icon: string }> = {
  crowds: { label: 'Avoid Crowds', icon: '👥' },
  noise: { label: 'Noise Sensitive', icon: '🔇' },
  extreme_heat: { label: 'Extreme Heat', icon: '🌡️' },
  extreme_cold: { label: 'Extreme Cold', icon: '❄️' },
  driving: { label: 'Avoid Driving', icon: '🚗' },
  flying: { label: 'Avoid Flying', icon: '✈️' },
  long_walks: { label: 'Avoid Long Walks', icon: '🚶' },
  climbing: { label: 'No Climbing', icon: '🧗' },
  water_activities: { label: 'No Water Activities', icon: '🏊' },
};

export const HOTEL_PREFERENCES: Record<HotelPreference, { label: string; icon: string }> = {
  budget: { label: 'Budget', icon: '💰' },
  comfort: { label: 'Comfort', icon: '🛏️' },
  luxury: { label: 'Luxury', icon: '👑' },
  boutique: { label: 'Boutique', icon: '✨' },
  all_inclusive: { label: 'All Inclusive', icon: '🎉' },
};

// ============= Trip Types =============

export const TRIP_TYPES: Record<TripType, { label: string; description: string; icon: string }> = {
  adventure: {
    label: 'Adventure',
    description: 'Adrenaline-pumping activities and outdoor exploration',
    icon: '🪂',
  },
  relaxation: {
    label: 'Relaxation',
    description: 'Beach time, spas, and leisurely activities',
    icon: '🌴',
  },
  cultural: {
    label: 'Cultural',
    description: 'Museums, historical sites, and local traditions',
    icon: '🏛️',
  },
  family: {
    label: 'Family',
    description: 'Activities suitable for all ages',
    icon: '👨‍👩‍👧‍👦',
  },
  romantic: {
    label: 'Romantic',
    description: 'Wine tastings, fine dining, scenic views',
    icon: '💑',
  },
  food: {
    label: 'Food & Wine',
    description: 'Culinary experiences and local cuisine',
    icon: '🍽️',
  },
  business: {
    label: 'Business',
    description: 'Conferences with leisure time',
    icon: '💼',
  },
};

// ============= Day Colors =============

export const DAY_COLORS: string[] = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
  '#F8B739', // Orange
  '#52C41A', // Green
];

// ============= Generation Configuration =============

export const GENERATION_STEPS: Record<GenerationStep, { label: string; order: number }> = {
  analyzing_destination: { label: 'Analyzing Destination', order: 1 },
  generating_daily_activities: { label: 'Generating Activities', order: 2 },
  finding_restaurants: { label: 'Finding Restaurants', order: 3 },
  booking_accommodations: { label: 'Planning Accommodations', order: 4 },
  planning_transit: { label: 'Planning Transit', order: 5 },
  finalizing_itinerary: { label: 'Finalizing Itinerary', order: 6 },
};

// ============= API Configuration =============

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const API_TIMEOUT = 30000; // 30 seconds

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',

  // Trips
  TRIPS_LIST: '/trips',
  TRIPS_CREATE: '/trips',
  TRIPS_GET: (id: string) => `/trips/${id}`,
  TRIPS_UPDATE: (id: string) => `/trips/${id}`,
  TRIPS_DELETE: (id: string) => `/trips/${id}`,
  TRIPS_GENERATE: (id: string) => `/trips/${id}/generate`,
  TRIPS_CONFIRM: (id: string) => `/trips/${id}/confirm`,

  // Days
  DAYS_CREATE: (tripId: string) => `/trips/${tripId}/days`,
  DAYS_GET: (tripId: string, dayId: string) => `/trips/${tripId}/days/${dayId}`,
  DAYS_UPDATE: (tripId: string, dayId: string) => `/trips/${tripId}/days/${dayId}`,

  // Activities
  ACTIVITIES_CREATE: (tripId: string, dayId: string) =>
    `/trips/${tripId}/days/${dayId}/activities`,
  ACTIVITIES_UPDATE: (tripId: string, dayId: string, activityId: string) =>
    `/trips/${tripId}/days/${dayId}/activities/${activityId}`,
  ACTIVITIES_DELETE: (tripId: string, dayId: string, activityId: string) =>
    `/trips/${tripId}/days/${dayId}/activities/${activityId}`,

  // Restaurants
  RESTAURANTS_SEARCH: '/restaurants/search',
  RESTAURANTS_GET: (id: string) => `/restaurants/${id}`,

  // Hotels
  HOTELS_SEARCH: '/hotels/search',
  HOTELS_GET: (id: string) => `/hotels/${id}`,

  // External Places
  PLACES_SEARCH: '/places/search',

  // Reflections
  REFLECTIONS_CREATE: (tripId: string) => `/trips/${tripId}/reflections`,
  REFLECTIONS_GET: (tripId: string) => `/trips/${tripId}/reflections`,
};

// ============= Price Levels =============

export const PRICE_LEVEL_LABELS: Record<number, string> = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
  5: '$$$$$',
};

export const PRICE_LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: 'Budget-friendly',
  2: 'Moderate',
  3: 'Upscale',
  4: 'Fine Dining',
  5: 'Michelin Star',
};

// ============= Validation Rules =============

export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  TRIP_TITLE_MIN: 3,
  TRIP_TITLE_MAX: 100,
  DESTINATION_MIN: 2,
  DESTINATION_MAX: 100,
  MIN_TRIP_DAYS: 1,
  MAX_TRIP_DAYS: 365,
  MIN_TRAVELERS: 1,
  MAX_TRAVELERS: 100,
  ACTIVITY_TITLE_MIN: 3,
  ACTIVITY_TITLE_MAX: 200,
  NOTES_MAX: 5000,
};

// ============= Default Values =============

export const DEFAULTS = {
  PAGE_SIZE: 20,
  ACTIVITY_DURATION_MINUTES: 120,
  MEAL_DURATION_MINUTES: 90,
  DAILY_BUDGET_DEFAULT: 150,
  HOTEL_CHECK_IN_TIME: '15:00',
  HOTEL_CHECK_OUT_TIME: '11:00',
  ACTIVITY_START_TIME: '09:00',
  BREAKFAST_TIME: '07:30',
  LUNCH_TIME: '12:30',
  DINNER_TIME: '19:00',
};

// ============= Cache Configuration =============

export const CACHE_DURATIONS = {
  PLACES: 7 * 24 * 60 * 60 * 1000, // 7 days
  WEATHER: 12 * 60 * 60 * 1000, // 12 hours
  TRANSIT: 24 * 60 * 60 * 1000, // 24 hours
  PLACES_SEARCH: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ============= OAuth Configuration =============

export const OAUTH_CONFIG = {
  GOOGLE_SCOPE: ['profile', 'email'],
};

// ============= Error Messages =============

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to access this resource',
  NOT_FOUND: 'The requested resource was not found',
  INVALID_INPUT: 'The input provided is invalid',
  SERVER_ERROR: 'An unexpected server error occurred',
  NETWORK_ERROR: 'A network error occurred. Please try again.',
  GENERATION_FAILED: 'Failed to generate trip itinerary',
  INVALID_DATES: 'End date must be after start date',
  TRIP_NOT_FOUND: 'Trip not found',
  UNAUTHORIZED_TRIP_ACCESS: 'You do not have permission to access this trip',
};

// ============= Success Messages =============

export const SUCCESS_MESSAGES = {
  TRIP_CREATED: 'Trip created successfully',
  TRIP_UPDATED: 'Trip updated successfully',
  TRIP_DELETED: 'Trip deleted successfully',
  ACTIVITY_ADDED: 'Activity added successfully',
  ACTIVITY_UPDATED: 'Activity updated successfully',
  ACTIVITY_DELETED: 'Activity deleted successfully',
  TRIP_GENERATED: 'Itinerary generated successfully',
  TRIP_CONFIRMED: 'Trip confirmed successfully',
  LOGIN_SUCCESS: 'Logged in successfully',
};
