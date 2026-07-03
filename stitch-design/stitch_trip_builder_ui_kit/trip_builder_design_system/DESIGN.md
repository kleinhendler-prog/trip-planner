---
name: Trip Builder Design System
colors:
  surface: '#fcf8ff'
  surface-dim: '#dbd8e4'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2fe'
  surface-container: '#efecf8'
  surface-container-high: '#e9e6f3'
  surface-container-highest: '#e4e1ed'
  on-surface: '#1b1b23'
  on-surface-variant: '#464554'
  inverse-surface: '#303038'
  inverse-on-surface: '#f2effb'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#a53b22'
  on-secondary: '#ffffff'
  secondary-container: '#fe7d5e'
  on-secondary-container: '#711601'
  tertiary: '#904900'
  on-tertiary: '#ffffff'
  tertiary-container: '#b55d00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#ffdad2'
  secondary-fixed-dim: '#ffb4a3'
  on-secondary-fixed: '#3d0700'
  on-secondary-fixed-variant: '#84240d'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#fcf8ff'
  on-background: '#1b1b23'
  surface-variant: '#e4e1ed'
typography:
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-mono:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  container_max: 1200px
---

## Brand & Style

The design system is built to feel like a knowledgeable, enthusiastic travel companion rather than a utility tool. The personality is **playful, vibrant, and optimistic**, prioritizing ease of use through a welcoming visual language. 

The aesthetic direction combines **Minimalism** with **Tactile** elements. It utilizes heavy whitespace and a clean layout to reduce the cognitive load of travel planning, while employing soft shadows and high-gloss gradients to make the interface feel touchable and responsive. This approach avoids "corporate" sterility by leaning into organic shapes, warm neutrals, and a high-energy color palette that evokes the excitement of a new journey.

## Colors

This design system uses a warm-toned foundation to maintain an inviting atmosphere. The **Primary** brand expression is a vibrant indigo-to-purple gradient, used sparingly for high-action elements. The **Secondary** coral provides a sun-kissed accent for highlights and secondary actions.

The **Background** is a deliberate off-white to reduce eye strain and provide a "paper-like" warmth. For the itinerary view, a specific ten-color **Day Palette** is used to provide distinct visual coding for different days of the trip, ensuring that even complex schedules remain legible and organized.

## Typography

The typography strategy balances character with clarity. 
- **Headlines** utilize **Plus Jakarta Sans** for its soft, geometric terminals and modern, welcoming feel. 
- **Body Text** uses **Be Vietnam Pro**, which offers excellent readability and a contemporary, casual tone.
- **Accents and Times** use **Space Grotesk**. This monospaced-adjacent font provides a technical "itinerary" look for timestamps, flight numbers, and durations, creating a clear visual distinction from narrative text.

## Layout & Spacing

The layout philosophy follows a **fluid grid** model with generous "breathing room." The spacing rhythm is based on an 8px scale, with **16px (md)** and **24px (lg)** being the primary workhorses for internal padding and component margins.

Interfaces should feel airy and uncrowded. Use the **lg (24px)** spacing for card containers and major section breaks to emphasize the friendly, non-corporate vibe. Gutters between cards should be consistent at 20px to allow shadows to breathe without overlapping awkwardly.

## Elevation & Depth

Visual hierarchy in this design system is achieved through **Ambient Shadows** and **Tonal Layering**. Instead of harsh black shadows, we use a warm, low-opacity charcoal tint (#1A1A2E at 8%) to ground elements.

- **Level 1 (Cards):** Soft, wide-dispersion shadow (0 4px 12px) to lift travel plans off the warm background.
- **Level 2 (Buttons/Modals):** More pronounced shadow (0 8px 24px) with a slight primary-color tint to indicate interactivity and immediate focus.
- **Interactive States:** On hover, cards should subtly lift (shadow expands) to provide tactile feedback.

## Shapes

The shape language is defined by significant **roundedness**, reinforcing the "friendly companion" persona. 
- **Cards and Containers:** Use a 16px radius (2xl) to create a soft, modern container.
- **Interactive Elements:** Buttons, tags, and badges must use a **Full Round (Pill)** shape. This distinguishes them from informational cards and invites clicking.
- **Selection States:** Use a 4px inner stroke or a subtle background tint to show selection, never losing the established rounded profile.

## Components

### Buttons
- **Primary:** Full-round (pill), gradient background, white text, subtle shadow.
- **Secondary:** Full-round, coral background or coral outline, depending on the hierarchy.
- **Ghost:** Full-round, no background, muted gray text, appears on hover.

### Badges & Chips
- **Status Indicators:** Always pill-shaped with light background tints and bold text.
    - **Danger (Red):** "Must Book"
    - **Warning (Amber):** "Book Ahead"
    - **Success (Green):** "Walk-in OK"
- **Day Tags:** Small pill badges using the Day Palette colors to denote which day an activity belongs to.

### Cards
- **Itinerary Card:** White background, 16px rounded corners, 24px padding. Must include a clear "Space Grotesk" timestamp in the top right.
- **Activity Card:** Includes a leading image with 12px rounded corners inside the 16px card container.

### Input Fields
- Rounded (12px), warm-gray borders (1px), and #FAFAF8 background. Focus state switches border to Primary Blue with a soft outer glow.

### Map Pins
- Teardrop shape with a white inner circle. The pin color should match the Day Palette color for the current active day.