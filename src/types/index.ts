/**
 * Trip Planner Type Definitions
 * Comprehensive TypeScript types for the entire application
 */

// ============= Core Domain Types =============

export type TripType = 'adventure' | 'relaxation' | 'cultural' | 'family' | 'romantic' | 'food' | 'business';

export type Interest =
  | 'hiking'
  | 'museums'
  | 'beaches'
  | 'nightlife'
  | 'food'
  | 'shopping'
  | 'history'
  | 'art'
  | 'sports'
  | 'nature'
  | 'architecture'
  | 'photography'
  | 'wellness'
  | 'adventure'
  | 'music';

export type Dislike =
  | 'crowds'
  | 'noise'
  | 'extreme_heat'
  | 'extreme_cold'
  | 'driving'
  | 'flying'
  | 'long_walks'
  | 'climbing'
  | 'water_activities';

export type HotelPreference = 'budget' | 'comfort' | 'luxury' | 'boutique' | 'all_inclusive';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export type TransitMode = 'walking' | 'public_transit' | 'taxi' | 'car_rental' | 'bike';

export type ActivityType =
  | 'sightseeing'
  | 'dining'
  | 'activity'
  | 'nightlife'
  | 'shopping'
  | 'wellness'
  | 'sports';

// ============= User & Preferences =============

export interface UserPreference {
  interests: Interest[];
  dislikes: Dislike[];
  hotelPreference: HotelPreference;
  mealDietaryRestrictions?: string[];
  mobilityNeeds?: string;
  budget?: 'budget' | 'moderate' | 'luxury';
  pace?: 'relaxed' | 'moderate' | 'packed';
}

export interface CreateTripInput {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  tripType: TripType;
  preferences: Partial<UserPreference>;
}

// ============= Destination =============

export type DestinationSource = 'google_places' | 'custom';

export interface PlacesCache {
  id: string;
  googlePlacesId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeType: 'restaurant' | 'hotel' | 'activity' | 'attraction';
  rating?: number;
  reviewCount?: number;
  website?: string;
  phoneNumber?: string;
  openingHours?: string[];
  priceLevel?: number;
  photos?: string[];
  cached_at: Date;
}

export interface WeatherData {
  date: string;
  highTemp: number;
  lowTemp: number;
  condition: string;
  icon: string;
  precipitation: number;
}

export interface TransitInfo {
  mode: TransitMode;
  duration: number; // in minutes
  distance?: number; // in km
  cost?: number;
  instructions?: string;
}

// ============= Trip Structure =============

export interface Trip {
  id: string;
  userId: string;
  title: string;
  destination: string;
  destinationCoordinates?: {
    lat: number;
    lng: number;
  };
  startDate: string;
  endDate: string;
  travelers: number;
  tripType: TripType;
  preferences: UserPreference;
  status: 'planning' | 'generated' | 'finalized' | 'completed' | 'archived';
  days: Day[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Day {
  id: string;
  tripId: string;
  date: string;
  dayNumber: number;
  theme?: string;
  activities: Activity[];
  meals: Meal[];
  notes?: string;
  weather?: WeatherData;
  colorHex?: string;
}

export interface Activity {
  id: string;
  dayId: string;
  title: string;
  description?: string;
  type: ActivityType;
  location?: {
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  googlePlacesId?: string;
  startTime: string; // HH:MM format
  endTime?: string; // HH:MM format
  duration?: number; // in minutes
  estimatedCost?: number;
  notes?: string;
  bookingUrl?: string;
  externalLinks?: {
    googleMaps?: string;
    website?: string;
  };
  order: number;
}

export interface Meal {
  id: string;
  dayId: string;
  type: MealType;
  restaurant: Restaurant;
  startTime?: string; // HH:MM format
  estimatedCost?: number;
  notes?: string;
  order: number;
}

export interface Restaurant {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  cuisine?: string[];
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  googlePlacesId?: string;
  website?: string;
  phoneNumber?: string;
  bookingUrl?: string;
  dietaryOptions?: string[];
}

export interface Hotel {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviewCount?: number;
  pricePerNight?: number;
  priceLevel?: number;
  googlePlacesId?: string;
  website?: string;
  phoneNumber?: string;
  bookingUrl?: string;
  amenities?: string[];
  checkInDate: string;
  checkOutDate: string;
  roomType?: string;
}

// ============= Generation & AI =============

export type GenerationStep =
  | 'analyzing_destination'
  | 'generating_daily_activities'
  | 'finding_restaurants'
  | 'booking_accommodations'
  | 'planning_transit'
  | 'finalizing_itinerary';

export interface GenerationJob {
  id: string;
  tripId: string;
  userId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  currentStep?: GenerationStep;
  progress: number; // 0-100
  errors?: string[];
  startedAt: Date;
  completedAt?: Date;
}

export interface GenerationProgress {
  jobId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  currentStep?: GenerationStep;
  progress: number;
  message?: string;
}

// ============= Trip Reflections =============

export interface TripConfirmation {
  tripId: string;
  userId: string;
  confirmedAt: Date;
  hotelConfirmed: boolean;
  activitiesConfirmed: boolean;
  restaurantsConfirmed: boolean;
  budgetApproved: boolean;
  notes?: string;
}

export interface TripReflection {
  id: string;
  tripId: string;
  userId: string;
  overallRating: number; // 1-5
  bestMoment?: string;
  worstMoment?: string;
  budgetAccuracy: 'under' | 'accurate' | 'over';
  wouldRepeatDestination: boolean;
  recommendations?: string[];
  createdAt: Date;
}

// ============= API Response Types =============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============= Authentication =============

export interface User {
  id: string;
  email: string;
  name?: string;
  passwordHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  expires: string;
}

// ============= Database Schema Types (Supabase) =============

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<User, 'id'>>;
      };
      trips: {
        Row: Trip;
        Insert: Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'days'>;
        Update: Partial<Omit<Trip, 'id' | 'days'>>;
      };
      days: {
        Row: Day;
        Insert: Omit<Day, 'id'>;
        Update: Partial<Omit<Day, 'id'>>;
      };
      activities: {
        Row: Activity;
        Insert: Omit<Activity, 'id'>;
        Update: Partial<Omit<Activity, 'id'>>;
      };
      meals: {
        Row: Meal;
        Insert: Omit<Meal, 'id'>;
        Update: Partial<Omit<Meal, 'id'>>;
      };
      restaurants: {
        Row: Restaurant;
        Insert: Omit<Restaurant, 'id'>;
        Update: Partial<Omit<Restaurant, 'id'>>;
      };
      hotels: {
        Row: Hotel;
        Insert: Omit<Hotel, 'id'>;
        Update: Partial<Omit<Hotel, 'id'>>;
      };
      places_cache: {
        Row: PlacesCache;
        Insert: Omit<PlacesCache, 'id' | 'cached_at'>;
        Update: Partial<Omit<PlacesCache, 'id'>>;
      };
      generation_jobs: {
        Row: GenerationJob;
        Insert: Omit<GenerationJob, 'id' | 'startedAt'>;
        Update: Partial<Omit<GenerationJob, 'id'>>;
      };
      trip_confirmations: {
        Row: TripConfirmation;
        Insert: Omit<TripConfirmation, 'confirmedAt'>;
        Update: Partial<Omit<TripConfirmation, 'confirmedAt'>>;
      };
      trip_reflections: {
        Row: TripReflection;
        Insert: Omit<TripReflection, 'id' | 'createdAt'>;
        Update: Partial<Omit<TripReflection, 'id'>>;
      };
    };
  };
}

// ============= Generation Pipeline Types =============

export interface DailyItinerary {
  day: number;
  date: string;
  theme: string;
  activities: Activity[];
  weatherExpected?: {
    temp: number;
    condition: string;
    precipitation?: number;
  };
  meals?: Record<MealType, string>;
}

export interface Itinerary {
  tripId: string;
  days: DailyItinerary[];
  totalCost?: number;
  highlights?: string[];
  logistics?: string[];
}

export interface QACheckResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
}

export interface DestinationSourceInfo {
  id: string;
  destinationKey: string;
  audienceType: string;
  domain: string;
  sourceName: string;
  focus?: string;
  trustRating: 'high' | 'medium' | 'low';
  active: boolean;
}

export interface ClimateNorms {
  month: number;
  tempMin: number;
  tempMax: number;
  precipitation: number;
  rainyDays: number;
}

export interface PlaceSearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  photoUrl?: string;
}
