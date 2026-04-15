/**
 * User Profile Type Definitions
 * Comprehensive profile schema for travel preferences and personalization
 */

export type ArtPreference =
  | 'classical'
  | 'modern_contemporary'
  | 'immersive'
  | 'photography'
  | 'design_fashion'
  | 'science_tech'
  | 'themed_niche';

export type MusicPreference =
  | 'classical_opera'
  | 'jazz_blues'
  | 'live_rock_indie'
  | 'folk_traditional'
  | 'electronic_clubs';

export type PerformingArtsPreference =
  | 'theater'
  | 'ballet'
  | 'musicals'
  | 'regional_dance'
  | 'circus_cabaret';

export type VisualArtPreference =
  | 'galleries'
  | 'street_art'
  | 'sculpture_parks'
  | 'architecture';

export type CuisinePreference =
  | 'italian'
  | 'french'
  | 'japanese'
  | 'chinese'
  | 'korean'
  | 'thai'
  | 'vietnamese'
  | 'indian'
  | 'mexican'
  | 'middle_eastern'
  | 'mediterranean'
  | 'american'
  | 'bbq'
  | 'nordic'
  | 'peruvian'
  | 'local_traditional';

export type DiningStylePreference =
  | 'michelin_tasting'
  | 'neighborhood_trattoria'
  | 'street_food_markets'
  | 'cafes_brunch'
  | 'food_halls'
  | 'home_cooking_experiences';

export type DietaryPreference =
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'gluten_free'
  | 'kosher'
  | 'halal'
  | 'dairy_free'
  | 'nut_allergy'
  | 'shellfish_allergy'
  | 'no_restrictions';

export type DrinkPreference =
  | 'wine'
  | 'craft_beer'
  | 'cocktails'
  | 'coffee_obsessed'
  | 'whisky_spirits'
  | 'tea'
  | 'non_drinker';

export type HistoryEraPreference =
  | 'prehistoric'
  | 'ancient'
  | 'medieval'
  | 'renaissance'
  | 'ottoman'
  | 'colonial'
  | 'ww1_ww2'
  | 'cold_war'
  | 'modern';

export type HistorySitePreference =
  | 'archaeological'
  | 'castles_palaces'
  | 'religious'
  | 'battlefields'
  | 'old_towns'
  | 'memorials';

export type HistoryDepthPreference =
  | 'photo_stop'
  | 'walkthrough'
  | 'guided_tour'
  | 'academic';

export type HikingLevelPreference =
  | 'flat'
  | 'moderate'
  | 'challenging'
  | 'multiday'
  | 'not_my_thing';

export type WaterActivityPreference =
  | 'beach_lounging'
  | 'swimming'
  | 'snorkeling'
  | 'scuba'
  | 'kayak_sup'
  | 'sailing'
  | 'fishing'
  | 'surfing';

export type LandscapePreference =
  | 'mountains'
  | 'forests'
  | 'deserts'
  | 'volcanoes'
  | 'coastlines'
  | 'lakes'
  | 'waterfalls'
  | 'caves';

export type WildlifePreference =
  | 'safari'
  | 'birdwatching'
  | 'whale_watching'
  | 'aquariums'
  | 'zoos';

export type GardenPreference =
  | 'botanical'
  | 'historic'
  | 'japanese'
  | 'modern_landscape';

export type FunAttractionPreference =
  | 'theme_parks'
  | 'water_parks'
  | 'mountain_coasters'
  | 'cable_cars'
  | 'observation_decks'
  | 'themed_museums'
  | 'science_centers'
  | 'aquariums_zoos'
  | 'escape_rooms'
  | 'arcades_bowling'
  | 'markets_fairs';

export type ShoppingPreference =
  | 'luxury_designer'
  | 'vintage_thrift'
  | 'artisan_crafts'
  | 'food_markets'
  | 'flea_markets_bazaars'
  | 'souvenirs'
  | 'bookstores'
  | 'record_stores'
  | 'themed_stores'
  | 'not_interested';

export type WellnessPreference =
  | 'spa_massage'
  | 'hammam'
  | 'thermal_springs'
  | 'yoga_meditation'
  | 'onsen'
  | 'float_tanks'
  | 'none';

export type SportsWatchingPreference =
  | 'football_soccer'
  | 'basketball'
  | 'baseball'
  | 'tennis'
  | 'local_sports';

export type SportsDoing =
  | 'skiing'
  | 'snowboarding'
  | 'cycling'
  | 'mountain_biking'
  | 'rock_climbing'
  | 'bouldering'
  | 'horseback'
  | 'paragliding'
  | 'hot_air_balloon'
  | 'skydiving'
  | 'bungee'
  | 'zipline';

export type NightlifePreference =
  | 'wine_bars'
  | 'pubs_beer'
  | 'live_music_clubs'
  | 'dance_clubs'
  | 'rooftop_sunset'
  | 'speakeasies'
  | 'early_dinners_only';

export type TourStylePreference =
  | 'private_guided'
  | 'small_group'
  | 'big_bus'
  | 'self_guided_audio'
  | 'meet_locals'
  | 'solitude';

export type TransportPreference =
  | 'walking'
  | 'metro_bus'
  | 'taxi_rideshare'
  | 'rental_car'
  | 'train'
  | 'bike'
  | 'private_driver';

export type AccessibilityPreference =
  | 'stairs_ok'
  | 'step_free'
  | 'mobility_aid'
  | 'stroller';

export type PacePreference = 'packed' | 'moderate' | 'relaxed';

export type ChronotypePrefence = 'morning_person' | 'night_owl' | 'no_preference';

export type PlanningStylePreference =
  | 'structured'
  | 'mornings_only_planned'
  | 'freestyle';

export type BudgetBandPreference =
  | 'shoestring'
  | 'comfort'
  | 'elevated'
  | 'luxury'
  | 'no_ceiling';

export type SplurgeOnPreference =
  | 'hotels'
  | 'food'
  | 'experiences'
  | 'shopping'
  | 'transport';

export type FoodAdventurousnessLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Comprehensive user profile with all travel preferences
 * All fields are optional - users can fill in as much or as little as they want
 */
export interface UserProfile {
  // Art & Culture
  art?: ArtPreference[];
  music?: MusicPreference[];
  performingArts?: PerformingArtsPreference[];
  visualArt?: VisualArtPreference[];

  // Food & Dining
  cuisinesLoved?: CuisinePreference[];
  cuisinesAvoided?: CuisinePreference[];
  diningStyle?: DiningStylePreference[];
  dietary?: DietaryPreference[];
  drinks?: DrinkPreference[];
  foodAdventurousness?: FoodAdventurousnessLevel;

  // History
  historyEras?: HistoryEraPreference[];
  historySites?: HistorySitePreference[];
  historyDepth?: HistoryDepthPreference;

  // Nature & Outdoors
  hikingLevel?: HikingLevelPreference;
  waterActivities?: WaterActivityPreference[];
  landscapes?: LandscapePreference[];
  wildlife?: WildlifePreference[];
  gardens?: GardenPreference[];

  // Fun & Entertainment
  funAttractions?: FunAttractionPreference[];
  shopping?: ShoppingPreference[];
  wellness?: WellnessPreference[];
  sportsWatching?: SportsWatchingPreference[];
  sportsDoing?: SportsDoing[];
  nightlife?: NightlifePreference[];

  // Travel Style
  tourStyle?: TourStylePreference[];
  transportPreferred?: TransportPreference[];
  accessibility?: AccessibilityPreference[];
  pace?: PacePreference;
  chronotype?: ChronotypePrefence;
  planningStyle?: PlanningStylePreference;

  // Budget & Splurges
  budgetBand?: BudgetBandPreference;
  splurgeOn?: SplurgeOnPreference[];

  // Personal Notes
  pastTripBest?: string;
  pastTripWorst?: string;
  bucketList?: string;
  additionalNotes?: string;
}
