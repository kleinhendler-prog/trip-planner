'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { AppShell } from '@/components/layout/app-shell';
import type { UserProfile } from '@/types/profile';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch existing profile on mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      setShowSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Multi-select chip handler
  const handleChipChange = <K extends keyof UserProfile>(
    key: K,
    selected: (string | number)[]
  ) => {
    setProfile((prev) => ({
      ...prev,
      [key]: selected as any,
    }));
  };

  // Single-select pill handler
  const handleSingleSelect = <K extends keyof UserProfile>(
    key: K,
    value: string
  ) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value as any,
    }));
  };

  // Text area handler
  const handleTextChange = <K extends keyof UserProfile>(
    key: K,
    value: string
  ) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value as any,
    }));
  };

  if (status === 'loading' || loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </AppShell>
    );
  }

  const artOptions = [
    { value: 'classical', label: 'Classical' },
    { value: 'modern_contemporary', label: 'Modern & Contemporary' },
    { value: 'immersive', label: 'Immersive' },
    { value: 'photography', label: 'Photography' },
    { value: 'design_fashion', label: 'Design & Fashion' },
    { value: 'science_tech', label: 'Science & Tech' },
    { value: 'themed_niche', label: 'Themed & Niche' },
  ];

  const musicOptions = [
    { value: 'classical_opera', label: 'Classical & Opera' },
    { value: 'jazz_blues', label: 'Jazz & Blues' },
    { value: 'live_rock_indie', label: 'Live Rock & Indie' },
    { value: 'folk_traditional', label: 'Folk & Traditional' },
    { value: 'electronic_clubs', label: 'Electronic & Clubs' },
  ];

  const performingArtsOptions = [
    { value: 'theater', label: 'Theater' },
    { value: 'ballet', label: 'Ballet' },
    { value: 'musicals', label: 'Musicals' },
    { value: 'regional_dance', label: 'Regional Dance' },
    { value: 'circus_cabaret', label: 'Circus & Cabaret' },
  ];

  const visualArtOptions = [
    { value: 'galleries', label: 'Galleries' },
    { value: 'street_art', label: 'Street Art' },
    { value: 'sculpture_parks', label: 'Sculpture Parks' },
    { value: 'architecture', label: 'Architecture' },
  ];

  const cuisineOptions = [
    { value: 'italian', label: 'Italian' },
    { value: 'french', label: 'French' },
    { value: 'japanese', label: 'Japanese' },
    { value: 'chinese', label: 'Chinese' },
    { value: 'korean', label: 'Korean' },
    { value: 'thai', label: 'Thai' },
    { value: 'vietnamese', label: 'Vietnamese' },
    { value: 'indian', label: 'Indian' },
    { value: 'mexican', label: 'Mexican' },
    { value: 'middle_eastern', label: 'Middle Eastern' },
    { value: 'mediterranean', label: 'Mediterranean' },
    { value: 'american', label: 'American' },
    { value: 'bbq', label: 'BBQ' },
    { value: 'nordic', label: 'Nordic' },
    { value: 'peruvian', label: 'Peruvian' },
    { value: 'local_traditional', label: 'Local & Traditional' },
  ];

  const diningStyleOptions = [
    { value: 'michelin_tasting', label: 'Michelin Tasting Menus' },
    { value: 'neighborhood_trattoria', label: 'Neighborhood Trattoria' },
    { value: 'street_food_markets', label: 'Street Food & Markets' },
    { value: 'cafes_brunch', label: 'Cafes & Brunch' },
    { value: 'food_halls', label: 'Food Halls' },
    { value: 'home_cooking_experiences', label: 'Home Cooking Experiences' },
  ];

  const dietaryOptions = [
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'pescatarian', label: 'Pescatarian' },
    { value: 'gluten_free', label: 'Gluten Free' },
    { value: 'kosher', label: 'Kosher' },
    { value: 'halal', label: 'Halal' },
    { value: 'dairy_free', label: 'Dairy Free' },
    { value: 'nut_allergy', label: 'Nut Allergy' },
    { value: 'shellfish_allergy', label: 'Shellfish Allergy' },
    { value: 'no_restrictions', label: 'No Restrictions' },
  ];

  const drinkOptions = [
    { value: 'wine', label: 'Wine' },
    { value: 'craft_beer', label: 'Craft Beer' },
    { value: 'cocktails', label: 'Cocktails' },
    { value: 'coffee_obsessed', label: 'Coffee Obsessed' },
    { value: 'whisky_spirits', label: 'Whisky & Spirits' },
    { value: 'tea', label: 'Tea' },
    { value: 'non_drinker', label: 'Non-Drinker' },
  ];

  const foodAdventurousnessOptions = [
    { value: 1, label: '1 - Stick to familiar foods' },
    { value: 2, label: '2 - Mostly familiar' },
    { value: 3, label: '3 - Open to trying things' },
    { value: 4, label: '4 - Adventure-ready' },
    { value: 5, label: '5 - Try anything!' },
  ];

  const historyEraOptions = [
    { value: 'prehistoric', label: 'Prehistoric' },
    { value: 'ancient', label: 'Ancient' },
    { value: 'medieval', label: 'Medieval' },
    { value: 'renaissance', label: 'Renaissance' },
    { value: 'ottoman', label: 'Ottoman' },
    { value: 'colonial', label: 'Colonial' },
    { value: 'ww1_ww2', label: 'WWI & WWII' },
    { value: 'cold_war', label: 'Cold War' },
    { value: 'modern', label: 'Modern' },
  ];

  const historySiteOptions = [
    { value: 'archaeological', label: 'Archaeological Sites' },
    { value: 'castles_palaces', label: 'Castles & Palaces' },
    { value: 'religious', label: 'Religious Sites' },
    { value: 'battlefields', label: 'Battlefields' },
    { value: 'old_towns', label: 'Old Towns' },
    { value: 'memorials', label: 'Memorials' },
  ];

  const historyDepthOptions = [
    { value: 'photo_stop', label: 'Quick Photo Stop' },
    { value: 'walkthrough', label: 'Walkthrough' },
    { value: 'guided_tour', label: 'Guided Tour' },
    { value: 'academic', label: 'Academic Deep Dive' },
  ];

  const hikingLevelOptions = [
    { value: 'flat', label: 'Flat Walks' },
    { value: 'moderate', label: 'Moderate Hiking' },
    { value: 'challenging', label: 'Challenging Hikes' },
    { value: 'multiday', label: 'Multi-Day Treks' },
    { value: 'not_my_thing', label: 'Not My Thing' },
  ];

  const waterActivityOptions = [
    { value: 'beach_lounging', label: 'Beach Lounging' },
    { value: 'swimming', label: 'Swimming' },
    { value: 'snorkeling', label: 'Snorkeling' },
    { value: 'scuba', label: 'Scuba Diving' },
    { value: 'kayak_sup', label: 'Kayak & SUP' },
    { value: 'sailing', label: 'Sailing' },
    { value: 'fishing', label: 'Fishing' },
    { value: 'surfing', label: 'Surfing' },
  ];

  const landscapeOptions = [
    { value: 'mountains', label: 'Mountains' },
    { value: 'forests', label: 'Forests' },
    { value: 'deserts', label: 'Deserts' },
    { value: 'volcanoes', label: 'Volcanoes' },
    { value: 'coastlines', label: 'Coastlines' },
    { value: 'lakes', label: 'Lakes' },
    { value: 'waterfalls', label: 'Waterfalls' },
    { value: 'caves', label: 'Caves' },
  ];

  const wildlifeOptions = [
    { value: 'safari', label: 'Safari' },
    { value: 'birdwatching', label: 'Birdwatching' },
    { value: 'whale_watching', label: 'Whale Watching' },
    { value: 'aquariums', label: 'Aquariums' },
    { value: 'zoos', label: 'Zoos' },
  ];

  const gardenOptions = [
    { value: 'botanical', label: 'Botanical Gardens' },
    { value: 'historic', label: 'Historic Gardens' },
    { value: 'japanese', label: 'Japanese Gardens' },
    { value: 'modern_landscape', label: 'Modern Landscape' },
  ];

  const funAttractionOptions = [
    { value: 'theme_parks', label: 'Theme Parks' },
    { value: 'water_parks', label: 'Water Parks' },
    { value: 'mountain_coasters', label: 'Mountain Coasters' },
    { value: 'cable_cars', label: 'Cable Cars' },
    { value: 'observation_decks', label: 'Observation Decks' },
    { value: 'themed_museums', label: 'Themed Museums' },
    { value: 'science_centers', label: 'Science Centers' },
    { value: 'aquariums_zoos', label: 'Aquariums & Zoos' },
    { value: 'escape_rooms', label: 'Escape Rooms' },
    { value: 'arcades_bowling', label: 'Arcades & Bowling' },
    { value: 'markets_fairs', label: 'Markets & Fairs' },
  ];

  const shoppingOptions = [
    { value: 'luxury_designer', label: 'Luxury & Designer' },
    { value: 'vintage_thrift', label: 'Vintage & Thrift' },
    { value: 'artisan_crafts', label: 'Artisan & Crafts' },
    { value: 'food_markets', label: 'Food Markets' },
    { value: 'flea_markets_bazaars', label: 'Flea Markets & Bazaars' },
    { value: 'souvenirs', label: 'Souvenirs' },
    { value: 'bookstores', label: 'Bookstores' },
    { value: 'record_stores', label: 'Record Stores' },
    { value: 'themed_stores', label: 'Themed Stores' },
    { value: 'not_interested', label: 'Not Interested' },
  ];

  const wellnessOptions = [
    { value: 'spa_massage', label: 'Spa & Massage' },
    { value: 'hammam', label: 'Hammam' },
    { value: 'thermal_springs', label: 'Thermal Springs' },
    { value: 'yoga_meditation', label: 'Yoga & Meditation' },
    { value: 'onsen', label: 'Onsen' },
    { value: 'float_tanks', label: 'Float Tanks' },
    { value: 'none', label: 'None' },
  ];

  const sportsWatchingOptions = [
    { value: 'football_soccer', label: 'Football/Soccer' },
    { value: 'basketball', label: 'Basketball' },
    { value: 'baseball', label: 'Baseball' },
    { value: 'tennis', label: 'Tennis' },
    { value: 'local_sports', label: 'Local Sports' },
  ];

  const sportsDoing = [
    { value: 'skiing', label: 'Skiing' },
    { value: 'snowboarding', label: 'Snowboarding' },
    { value: 'cycling', label: 'Cycling' },
    { value: 'mountain_biking', label: 'Mountain Biking' },
    { value: 'rock_climbing', label: 'Rock Climbing' },
    { value: 'bouldering', label: 'Bouldering' },
    { value: 'horseback', label: 'Horseback Riding' },
    { value: 'paragliding', label: 'Paragliding' },
    { value: 'hot_air_balloon', label: 'Hot Air Balloon' },
    { value: 'skydiving', label: 'Skydiving' },
    { value: 'bungee', label: 'Bungee' },
    { value: 'zipline', label: 'Zipline' },
  ];

  const nightlifeOptions = [
    { value: 'wine_bars', label: 'Wine Bars' },
    { value: 'pubs_beer', label: 'Pubs & Beer' },
    { value: 'live_music_clubs', label: 'Live Music Clubs' },
    { value: 'dance_clubs', label: 'Dance Clubs' },
    { value: 'rooftop_sunset', label: 'Rooftop & Sunset' },
    { value: 'speakeasies', label: 'Speakeasies' },
    { value: 'early_dinners_only', label: 'Early Dinners Only' },
  ];

  const tourStyleOptions = [
    { value: 'private_guided', label: 'Private Guided' },
    { value: 'small_group', label: 'Small Group' },
    { value: 'big_bus', label: 'Big Bus Tours' },
    { value: 'self_guided_audio', label: 'Self-Guided Audio' },
    { value: 'meet_locals', label: 'Meet Locals' },
    { value: 'solitude', label: 'Solitude' },
  ];

  const transportOptions = [
    { value: 'walking', label: 'Walking' },
    { value: 'metro_bus', label: 'Metro & Bus' },
    { value: 'taxi_rideshare', label: 'Taxi & Rideshare' },
    { value: 'rental_car', label: 'Rental Car' },
    { value: 'train', label: 'Train' },
    { value: 'bike', label: 'Bike' },
    { value: 'private_driver', label: 'Private Driver' },
  ];

  const accessibilityOptions = [
    { value: 'stairs_ok', label: 'Stairs OK' },
    { value: 'step_free', label: 'Step-Free' },
    { value: 'mobility_aid', label: 'Uses Mobility Aid' },
    { value: 'stroller', label: 'Traveling with Stroller' },
  ];

  const paceOptions = [
    { value: 'packed', label: 'Packed (5+ activities/day)' },
    { value: 'moderate', label: 'Moderate (3-4 activities/day)' },
    { value: 'relaxed', label: 'Relaxed (2 activities/day)' },
  ];

  const chronotypeOptions = [
    { value: 'morning_person', label: 'Morning Person' },
    { value: 'night_owl', label: 'Night Owl' },
    { value: 'no_preference', label: 'No Preference' },
  ];

  const planningStyleOptions = [
    { value: 'structured', label: 'Structured (full itinerary)' },
    { value: 'mornings_only_planned', label: 'Mornings Planned' },
    { value: 'freestyle', label: 'Freestyle' },
  ];

  const budgetOptions = [
    { value: 'shoestring', label: 'Shoestring' },
    { value: 'comfort', label: 'Comfort' },
    { value: 'elevated', label: 'Elevated' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'no_ceiling', label: 'No Ceiling' },
  ];

  const splurgeOptions = [
    { value: 'hotels', label: 'Hotels' },
    { value: 'food', label: 'Food' },
    { value: 'experiences', label: 'Experiences' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'transport', label: 'Transport' },
  ];

  const SectionCard = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );

  const ChipField = ({
    label,
    options,
    value,
    onChange,
    helperText,
  }: {
    label: string;
    options: Array<{ value: string | number; label: string }>;
    value: (string | number)[];
    onChange: (val: (string | number)[]) => void;
    helperText?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-2">{label}</label>
      <Chip options={options} selectedValues={value} onChange={onChange} />
      {helperText && <p className="text-xs text-gray-500 mt-2">{helperText}</p>}
    </div>
  );

  const SingleSelectPills = ({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: Array<{ value: string; label: string }>;
    value: string | undefined;
    onChange: (val: string) => void;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              value === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  const TextAreaField = ({
    label,
    value,
    onChange,
    placeholder,
  }: {
    label: string;
    value: string | undefined;
    onChange: (val: string) => void;
    placeholder: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-2">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
        rows={3}
      />
    </div>
  );

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Travel Profile</h1>
            <div className="mt-3 space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-800">
                <span className="font-semibold">Why we ask:</span> Answer once and we'll tailor every trip to you. Everything is optional — skip what doesn't apply.
              </p>
              <p className="text-xs text-gray-600">You can edit these anytime.</p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success message */}
          {showSuccess && (
            <div className="mb-6 rounded-lg bg-green-50 p-4 border border-green-200">
              <p className="text-sm text-green-800">Profile saved! Redirecting...</p>
            </div>
          )}

          {/* Form Sections */}
          <div className="space-y-6">
            {/* Art & Culture */}
            <SectionCard icon="🎨" title="Art & Culture">
              <ChipField
                label="Art Preferences"
                options={artOptions}
                value={profile.art || []}
                onChange={(val) => handleChipChange('art', val)}
              />
              <ChipField
                label="Music"
                options={musicOptions}
                value={profile.music || []}
                onChange={(val) => handleChipChange('music', val)}
              />
              <ChipField
                label="Performing Arts"
                options={performingArtsOptions}
                value={profile.performingArts || []}
                onChange={(val) => handleChipChange('performingArts', val)}
              />
              <ChipField
                label="Visual Art"
                options={visualArtOptions}
                value={profile.visualArt || []}
                onChange={(val) => handleChipChange('visualArt', val)}
              />
            </SectionCard>

            {/* Food & Dining */}
            <SectionCard icon="🍽️" title="Food & Dining">
              <ChipField
                label="Cuisines You Love"
                options={cuisineOptions}
                value={profile.cuisinesLoved || []}
                onChange={(val) => handleChipChange('cuisinesLoved', val)}
              />
              <ChipField
                label="Cuisines to Avoid"
                options={cuisineOptions}
                value={profile.cuisinesAvoided || []}
                onChange={(val) => handleChipChange('cuisinesAvoided', val)}
              />
              <ChipField
                label="Dining Style"
                options={diningStyleOptions}
                value={profile.diningStyle || []}
                onChange={(val) => handleChipChange('diningStyle', val)}
              />
              <ChipField
                label="Dietary Preferences"
                options={dietaryOptions}
                value={profile.dietary || []}
                onChange={(val) => handleChipChange('dietary', val)}
              />
              <ChipField
                label="Beverages"
                options={drinkOptions}
                value={profile.drinks || []}
                onChange={(val) => handleChipChange('drinks', val)}
              />
              <SingleSelectPills
                label="Food Adventurousness"
                options={foodAdventurousnessOptions as any}
                value={String(profile.foodAdventurousness) || ''}
                onChange={(val) => handleSingleSelect('foodAdventurousness', val as any)}
              />
            </SectionCard>

            {/* History */}
            <SectionCard icon="🏛️" title="History">
              <ChipField
                label="Historical Eras"
                options={historyEraOptions}
                value={profile.historyEras || []}
                onChange={(val) => handleChipChange('historyEras', val)}
              />
              <ChipField
                label="History Sites"
                options={historySiteOptions}
                value={profile.historySites || []}
                onChange={(val) => handleChipChange('historySites', val)}
              />
              <SingleSelectPills
                label="Depth of Engagement"
                options={historyDepthOptions as any}
                value={profile.historyDepth}
                onChange={(val) => handleSingleSelect('historyDepth', val as any)}
              />
            </SectionCard>

            {/* Nature & Outdoors */}
            <SectionCard icon="🌿" title="Nature & Outdoors">
              <SingleSelectPills
                label="Hiking Level"
                options={hikingLevelOptions as any}
                value={profile.hikingLevel}
                onChange={(val) => handleSingleSelect('hikingLevel', val as any)}
              />
              <ChipField
                label="Water Activities"
                options={waterActivityOptions}
                value={profile.waterActivities || []}
                onChange={(val) => handleChipChange('waterActivities', val)}
              />
              <ChipField
                label="Landscapes"
                options={landscapeOptions}
                value={profile.landscapes || []}
                onChange={(val) => handleChipChange('landscapes', val)}
              />
              <ChipField
                label="Wildlife"
                options={wildlifeOptions}
                value={profile.wildlife || []}
                onChange={(val) => handleChipChange('wildlife', val)}
              />
              <ChipField
                label="Gardens"
                options={gardenOptions}
                value={profile.gardens || []}
                onChange={(val) => handleChipChange('gardens', val)}
              />
            </SectionCard>

            {/* Fun & Entertainment */}
            <SectionCard icon="🎢" title="Fun & Entertainment">
              <ChipField
                label="Attractions"
                options={funAttractionOptions}
                value={profile.funAttractions || []}
                onChange={(val) => handleChipChange('funAttractions', val)}
              />
              <ChipField
                label="Shopping"
                options={shoppingOptions}
                value={profile.shopping || []}
                onChange={(val) => handleChipChange('shopping', val)}
                helperText="Themed stores: e.g., Harry Potter, Stranger Things, Disney, anime/manga, Star Wars"
              />
              <ChipField
                label="Wellness"
                options={wellnessOptions}
                value={profile.wellness || []}
                onChange={(val) => handleChipChange('wellness', val)}
              />
              <ChipField
                label="Sports to Watch"
                options={sportsWatchingOptions}
                value={profile.sportsWatching || []}
                onChange={(val) => handleChipChange('sportsWatching', val)}
              />
              <ChipField
                label="Sports to Do"
                options={sportsDoing}
                value={profile.sportsDoing || []}
                onChange={(val) => handleChipChange('sportsDoing', val)}
              />
              <ChipField
                label="Nightlife"
                options={nightlifeOptions}
                value={profile.nightlife || []}
                onChange={(val) => handleChipChange('nightlife', val)}
              />
            </SectionCard>

            {/* Travel Style */}
            <SectionCard icon="⏰" title="Pace & Rhythm">
              <SingleSelectPills
                label="Daily Pace"
                options={paceOptions as any}
                value={profile.pace}
                onChange={(val) => handleSingleSelect('pace', val as any)}
              />
              <SingleSelectPills
                label="Chronotype"
                options={chronotypeOptions as any}
                value={profile.chronotype}
                onChange={(val) => handleSingleSelect('chronotype', val as any)}
              />
              <SingleSelectPills
                label="Planning Style"
                options={planningStyleOptions as any}
                value={profile.planningStyle}
                onChange={(val) => handleSingleSelect('planningStyle', val as any)}
              />
            </SectionCard>

            {/* Tour & Transport */}
            <SectionCard icon="👥" title="Tour Style & Transport">
              <ChipField
                label="Tour Style"
                options={tourStyleOptions}
                value={profile.tourStyle || []}
                onChange={(val) => handleChipChange('tourStyle', val)}
              />
              <ChipField
                label="Transport Preferred"
                options={transportOptions}
                value={profile.transportPreferred || []}
                onChange={(val) => handleChipChange('transportPreferred', val)}
              />
              <ChipField
                label="Accessibility Needs"
                options={accessibilityOptions}
                value={profile.accessibility || []}
                onChange={(val) => handleChipChange('accessibility', val)}
              />
            </SectionCard>

            {/* Budget */}
            <SectionCard icon="💰" title="Budget">
              <SingleSelectPills
                label="Budget Band"
                options={budgetOptions as any}
                value={profile.budgetBand}
                onChange={(val) => handleSingleSelect('budgetBand', val as any)}
              />
              <ChipField
                label="Where You Splurge"
                options={splurgeOptions}
                value={profile.splurgeOn || []}
                onChange={(val) => handleChipChange('splurgeOn', val)}
              />
            </SectionCard>

            {/* Personal Notes */}
            <SectionCard icon="📝" title="About You">
              <TextAreaField
                label="Best Past Trip"
                value={profile.pastTripBest}
                onChange={(val) => handleTextChange('pastTripBest', val)}
                placeholder="e.g., Tokyo 2023 — sushi, temples, and amazing street food"
              />
              <TextAreaField
                label="Worst Past Trip"
                value={profile.pastTripWorst}
                onChange={(val) => handleTextChange('pastTripWorst', val)}
                placeholder="e.g., Too rushed, bad weather, overbooked"
              />
              <TextAreaField
                label="Bucket List Destinations"
                value={profile.bucketList}
                onChange={(val) => handleTextChange('bucketList', val)}
                placeholder="e.g., Petra, Machu Picchu, Iceland"
              />
              <TextAreaField
                label="Additional Notes"
                value={profile.additionalNotes}
                onChange={(val) => handleTextChange('additionalNotes', val)}
                placeholder="Anything else we should know?"
              />
            </SectionCard>
          </div>

          {/* Sticky Button Bar */}
          <div className="sticky bottom-0 left-0 right-0 mt-8 pt-4 pb-4 bg-white border-t border-gray-200 flex gap-3 justify-center -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              disabled={saving}
            >
              Skip for now
            </Button>
            <Button
              onClick={handleSave}
              isLoading={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Profile
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
