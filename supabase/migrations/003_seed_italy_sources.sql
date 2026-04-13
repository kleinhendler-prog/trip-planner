-- Seed Italy-specific destination sources
-- Organized by region and category

-- Italy General
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
  ('italy', 'general', 'italymagazine.com', 'Italy Magazine', 'Italian culture, travel, and lifestyle', 'high', 'seeded', true),
  ('italy', 'general', 'walksofitaly.com', 'Walks of Italy', 'Walking tours and authentic experiences', 'high', 'seeded', true),
  ('italy', 'general', 'theromanguy.com', 'The Roman Guy', 'Italian history and travel stories', 'high', 'seeded', true),
  ('italy', 'general', 'earthtrekkers.com', 'Earth Trekkers', 'Italy travel guides and itineraries', 'high', 'seeded', true),
  ('italy', 'food', 'gamberorosso.it', 'Gambero Rosso', 'Italian gastronomy and wine guides', 'high', 'seeded', true),
  ('italy', 'general', 'elizabethminchilli.com', 'Elizabeth Minchilli', 'Italian food culture and recipes', 'high', 'seeded', true),

-- Rome
  ('rome', 'general', 'anamericaninrome.com', 'An American in Rome', 'Rome travel tips and cultural insights', 'high', 'seeded', true),
  ('rome', 'general', 'romewise.com', 'Rome Wise', 'Rome travel guides and advice', 'high', 'seeded', true),
  ('rome', 'family', 'romewithkids.com', 'Rome with Kids', 'Family-friendly Rome experiences', 'high', 'seeded', true),
  ('rome', 'general', 'romeing.it', 'Romeing', 'Local Rome insights and experiences', 'high', 'seeded', true),
  ('rome', 'food', 'katieparla.com', 'Katie Parla', 'Roman food and cuisine traditions', 'high', 'seeded', true),
  ('rome', 'general', 'timeout.com', 'Timeout Rome', 'Rome city guide and experiences', 'high', 'seeded', true),
  ('rome', 'general', 'revealedrome.com', 'Revealed Rome', 'Rome history and hidden gems', 'high', 'seeded', true),
  ('rome', 'food', 'parlafood.com', 'Parla Food', 'Italian food traditions and recipes', 'high', 'seeded', true),

-- Florence
  ('florence', 'general', 'girlinflorence.com', 'Girl in Florence', 'Florence travel and culture guide', 'high', 'seeded', true),
  ('florence', 'general', 'theflorentine.net', 'The Florentine', 'Florence news and cultural insights', 'high', 'seeded', true),
  ('florence', 'general', 'visitflorence.com', 'Visit Florence', 'Official Florence tourism guide', 'high', 'seeded', true),
  ('florence', 'general', 'emikodavies.com', 'Emiko Davies', 'Tuscan and Florence food experiences', 'high', 'seeded', true),
  ('florence', 'general', 'firenzemadeintuscany.com', 'Firenze Made in Tuscany', 'Florence and Tuscany artisan guide', 'high', 'seeded', true),

-- Venice
  ('venice', 'general', 'veneziadavivere.com', 'Venezia da Vivere', 'Venice local living guide', 'high', 'seeded', true),
  ('venice', 'general', 'monicacesarato.com', 'Monica Cesarato', 'Venice travel and culture insights', 'high', 'seeded', true),
  ('venice', 'general', 'theveniceinsider.com', 'The Venice Insider', 'Venice travel tips and secrets', 'high', 'seeded', true),
  ('venice', 'general', 'veniceforvisitors.com', 'Venice for Visitors', 'Venice practical travel guide', 'high', 'seeded', true),
  ('venice', 'general', 'livingvenice.it', 'Living Venice', 'Venice lifestyle and experiences', 'high', 'seeded', true),

-- Milan
  ('milan', 'general', 'yesmilano.it', 'Yes Milano', 'Milan city guide and experiences', 'high', 'seeded', true),
  ('milan', 'general', 'timeout.com', 'Timeout Milan', 'Milan entertainment and culture', 'high', 'seeded', true),
  ('milan', 'general', 'italianbark.com', 'Italian Bark', 'Milan design and culture insights', 'high', 'seeded', true),
  ('milan', 'general', 'milanoweekend.it', 'Milano Weekend', 'Milan events and activities guide', 'high', 'seeded', true),

-- Naples & Amalfi
  ('naples', 'general', 'napoliunplugged.com', 'Naples Unplugged', 'Naples authentic experiences', 'high', 'seeded', true),
  ('amalfi', 'general', 'ciaoamalfi.com', 'Ciao Amalfi', 'Amalfi Coast travel guide', 'high', 'seeded', true),
  ('sorrentino', 'general', 'sorrentoinsider.com', 'Sorrento Insider', 'Sorrento travel tips and insights', 'high', 'seeded', true),
  ('naples', 'food', 'pizzanapoletana.org', 'Pizza Napoletana', 'Neapolitan pizza traditions and culture', 'high', 'seeded', true),

-- Bologna
  ('bologna', 'general', 'bolognauncovered.com', 'Bologna Uncovered', 'Bologna travel and culture guide', 'high', 'seeded', true),
  ('bologna', 'food', 'taste-bologna.com', 'Taste Bologna', 'Bologna food and culinary traditions', 'high', 'seeded', true),
  ('bologna', 'food', 'emiliadelizia.com', 'Emilia Delizia', 'Emilia-Romagna food and recipes', 'high', 'seeded', true),

-- Tuscany
  ('tuscany', 'general', 'discovertuscany.com', 'Discover Tuscany', 'Tuscany travel and wine guide', 'high', 'seeded', true),
  ('tuscany', 'general', 'visittuscany.com', 'Visit Tuscany', 'Official Tuscany tourism guide', 'high', 'seeded', true),
  ('tuscany', 'general', 'tuscanynowandmore.com', 'Tuscany Now and More', 'Tuscany travel blog and insights', 'high', 'seeded', true),
  ('tuscany', 'wine', 'chianti.com', 'Chianti', 'Chianti wine region guide', 'high', 'seeded', true),

-- Sicily
  ('sicily', 'general', 'timesofsicily.com', 'Times of Sicily', 'Sicily culture and travel guide', 'high', 'seeded', true),
  ('sicily', 'food', 'besttasteofsicily.com', 'Best Taste of Sicily', 'Sicilian food and culinary traditions', 'high', 'seeded', true),
  ('sicily', 'general', 'thinksicily.com', 'Think Sicily', 'Sicily travel blog and insights', 'high', 'seeded', true),
  ('palermo', 'general', 'palermocoolhunting.it', 'Palermo Cool Hunting', 'Palermo culture and local guide', 'high', 'seeded', true);
