# Google Stitch Prompt — Trip Planner Design System

Copy and paste everything below into Stitch:

---

Design a full component library for a fun, colorful AI-powered trip planner web app called "Trip Builder". The vibe is playful, vibrant, and inviting — think friendly travel companion, not corporate booking tool. Use rounded corners (12-16px), soft shadows, and a bright but harmonious color palette with a primary blue-purple gradient accent.

## Color Palette
- Primary: a vibrant blue-to-purple gradient (for main actions, active states)
- Secondary: warm coral/orange (for alerts, booking urgency, highlights)
- Success: fresh green (for confirmations, walk-in OK badges)
- Warning: golden amber (for "book ahead" badges, parking suggestions)
- Danger: soft red (for "must book" badges, errors)
- Background: warm off-white (#FAFAF8 or similar), not stark white
- Cards: white with subtle warm shadow
- Text: dark charcoal (#1A1A2E), not pure black
- Muted text: warm gray (#6B7280)

## Typography
- Headings: rounded, friendly sans-serif (like Inter, Nunito, or Quicksand)
- Body: clean readable sans-serif
- Monospace accents for times (09:00, 12:30)

## Components Needed

### 1. Navigation / App Shell
- Top navbar with app logo ("Trip Builder" with a small plane or compass icon), user avatar, and a "New Trip" button
- Clean, minimal — no sidebar

### 2. Buttons
- Primary (gradient blue-purple, white text, rounded-full, slight shadow on hover)
- Secondary / Outline (border only, colored text)
- Ghost (text-only, subtle hover background)
- Destructive (soft red)
- Small size variant (for inline actions like "Book Now", "Open in Maps", "Suggest Alternative")
- Loading state with spinner
- Icon button variant

### 3. Cards
- Standard card: white background, rounded-2xl, warm shadow, optional colored left border
- Trip card (for the trip list): shows destination name, date range, traveler count, status badge, and a small preview image or gradient placeholder. Clickable.
- Day card: collapsible, with a colored circle showing the day number, day theme, date, neighborhood, and daily budget. Has up/down reorder arrows on the right.
- Activity card: horizontal layout with a colored numbered marker circle on the left, then time (monospace), activity name (bold), duration badge, cost badge, reservation status chip, and priority stars. Below: description, location, info box (clock icon, gray bg), tips box (lightbulb icon, blue bg), rainy day alternative (cloud icon, purple bg). Action buttons row at bottom.
- Hotel card: name, star rating (yellow stars), price range badge, area, short description, "Book" and "View on Map" buttons
- Local find card: emoji icon by type, name, cost badge, 1-line description, "View on map" link

### 4. Badges & Chips
- Reservation status chips:
  - "Must Book" — red background, white text
  - "Book Ahead" — amber background, dark text
  - "Walk-in OK" — green background, dark text
- Duration badge (outline, small, shows "2h" or "45min")
- Cost badge (secondary color, shows "€16")
- Priority stars (yellow, 1-5)
- Segment label chip (shows "🔗 Rome" or "🔗 Tuscany Road Trip" for multi-segment trips)
- Day filter toggle chip (colored dot + "Day 1", toggleable active/inactive state)

### 5. Banners / Alerts
- Must-Book-Now banner: red-tinted background, warning icon, list of attractions that need advance booking, each with a "Book Now" button
- Climate note banner: light blue background, sun/cloud icon, 1-line weather text
- Parking suggestion banner: amber background, parking P icon, suggestion text
- QA warning banner (optional): yellow background for validation warnings

### 6. Form Elements
- Text input with label (rounded, subtle border, focus ring in primary color)
- Date picker input
- Select dropdown
- Range slider (for "max driving hours")
- Number input (for adults count)
- Textarea (for notes, group description)
- Chip selector (multi-select grid of interest/dislike chips with icons — e.g., "🏛️ History", "🍕 Food", "🎨 Art")
- Trip type selector: 4 cards in a row (🏙️ Single City, 🗺️ Area, 🚗 Road Trip, 🔗 Multi-segment), selected one gets primary border + tinted background

### 7. Multi-Segment Builder
- A container that holds multiple "segment cards" stacked vertically
- Each segment card: border, rounded, contains segment type selector (3 small toggle buttons: City/Area/Road trip), destination input, date pickers, optional max-drive slider. Remove button in corner.
- "＋ Add Segment" button at the bottom (dashed border, outline style)

### 8. Progress & Loading
- Step progress bar (5 steps: Destination, Travelers, Interests, Preferences, Review) with numbered circles and connecting lines
- Generation loading state: pulsing progress bar + "AI is crafting your itinerary..." text
- Spinner (small, inline, for button loading states)

### 9. Panels & Overlays
- Suggestion panel (for "Suggest Alternative"): orange-tinted border and background, shows the suggested activity with all its details, plus Approve (green) / Deny / Re-suggest buttons and attempt counter "Attempt 1/3"
- What's Nearby panel: teal-tinted border and background, shows 2-3 nearby POIs with emoji, name, distance, cost, relevance note, map link. Dismiss button.
- Guide narration slide-over: slides in from the right, white panel with header (attraction name), close X button, and the narration text in readable prose

### 10. Map Area
- A card containing the map with day filter toggle chips above it
- The toggle chips are small rounded pills with a colored dot matching the day color

### 11. Budget Panel
- Collapsible card: header shows "Budget Estimate" + total badge, click to expand
- Inside: 3 colored stat boxes (Activities in blue, Meals in green, Hotels in purple) showing amounts
- Per-day average, breakdown text, disclaimer

### 12. Transit Indicator
- A thin dashed line between activities with "→ 12 min walk" or "→ 8 min metro" text centered on it

### 13. Review Screen Summary
- A summary card with labeled sections: DESTINATION (large), START/END dates, TRAVELERS count, TRIP TYPE, INTERESTS as colored chips. For multi-segment: show each segment as a mini-row.

### 14. Empty / Error States
- Empty state: friendly illustration placeholder + "No itinerary yet" text + action button
- Error state: soft red card + error message + retry button
- Generating state: animated progress + encouraging copy

## Design Principles
- Corners: consistently rounded (12-16px on cards, full-round on buttons and badges)
- Spacing: generous padding (16-24px inside cards), clear visual hierarchy
- Shadows: soft and warm, not harsh (e.g., 0 4px 12px rgba(0,0,0,0.08))
- Hover states: subtle lift or background tint, never jarring
- The overall feel should make trip planning feel exciting, not like filling out a tax form

## Color Usage Rules
- Primary gradient for main CTAs and active navigation
- Each day gets a unique color from a preset palette (blue, red, green, amber, purple, pink, teal, orange, indigo, lime) — used for day circles, map markers, and filter chips
- Status colors are always consistent: red=must book, amber=book ahead, green=walk-in OK
- Info boxes use tinted backgrounds matching their purpose (blue for tips, gray for hours, purple for rainy day, orange for suggestions, teal for nearby)
