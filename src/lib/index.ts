/**
 * Central export point for all library modules
 */

// API clients
export { callClaude, callClaudeJSON } from './claude';
export { searchPlaces, getPlaceDetails, autocompleteCity } from './google-places';
export {
  getClimateNorms,
  getDailyForecast,
  determineWeatherTier,
  isWeatherSuitableForActivity,
} from './weather';
export {
  getTransitTime,
  getMultiLocationRoute,
} from './transit';

// Source management
export {
  getDestinationSources,
  getTrustedDestinationSources,
  getSourcesByFocus,
  voteOnSource,
  addDestinationSource,
  getDefaultSources,
} from './source-resolver';

// Trip generation
export { GenerationPipeline, generateTrip } from './generation';

// Database
export { supabase } from './supabase';
