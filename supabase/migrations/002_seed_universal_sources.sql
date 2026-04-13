-- Seed universal sources for destination_key='*'
-- These sources apply to any destination

INSERT INTO public.destination_sources (
  destination_key,
  audience_type,
  domain,
  source_name,
  focus,
  trust_rating,
  added_by,
  active
) VALUES
  ('*', 'general', 'timeout.com', 'Timeout', 'City guides and local experiences', 'high', 'seeded', true),
  ('*', 'general', 'theculturetrip.com', 'The Culture Trip', 'Culture, food, and local perspectives', 'high', 'seeded', true),
  ('*', 'general', 'atlasobscura.com', 'Atlas Obscura', 'Hidden and unusual attractions', 'high', 'seeded', true),
  ('*', 'food', 'eater.com', 'Eater', 'Food and restaurant reviews', 'high', 'seeded', true),
  ('*', 'food', 'theinfatuation.com', 'The Infatuation', 'Dining and food culture', 'high', 'seeded', true),
  ('*', 'general', 'cntraveler.com', 'Condé Nast Traveler', 'Luxury travel and lifestyle', 'high', 'seeded', true),
  ('*', 'general', 'lonelyplanet.com', 'Lonely Planet', 'Comprehensive travel guides', 'high', 'seeded', true),
  ('*', 'general', 'reddit.com', 'Reddit Travel Communities', 'Local insights and peer reviews', 'medium', 'seeded', true),
  ('*', 'general', 'tripadvisor.com', 'TripAdvisor Attractions', 'Attraction reviews and ratings', 'medium', 'seeded', true),
  ('*', 'general', 'nytimes.com', 'New York Times Travel', 'Travel journalism and guides', 'high', 'seeded', true),
  ('*', 'general', 'afar.com', 'AFAR', 'Travel stories and recommendations', 'high', 'seeded', true),
  ('*', 'general', 'bbc.com', 'BBC Travel', 'Travel features and cultural insights', 'high', 'seeded', true);
