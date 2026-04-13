# Trip Planner Component Library

A comprehensive, reusable component library built with React, TypeScript, and Tailwind CSS for the Trip Planner Next.js 14 application.

## Components Overview

### UI Components

#### Button (`src/components/ui/button.tsx`)
- **Variants**: default, secondary, destructive, outline, ghost, link
- **Sizes**: default, sm, lg, icon
- **Props**: 
  - `variant`: Button style variant
  - `size`: Button size
  - `isLoading`: Shows spinner when true
  - `disabled`: Disables the button
  - `className`: Additional CSS classes (merged via cn utility)
- **Features**: Forward ref, loading spinner, full accessibility

```tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="lg" isLoading={false}>
  Click me
</Button>
```

#### Input (`src/components/ui/input.tsx`)
- **Props**:
  - `label`: Optional label above input
  - `error`: Error styling when true
  - `className`: Additional CSS classes
- **Features**: Forward ref, error styling, disabled state

```tsx
import { Input } from '@/components/ui/input';

<Input 
  label="Email" 
  type="email" 
  placeholder="Enter email" 
  error={hasError}
/>
```

#### Card Components (`src/components/ui/card.tsx`)
Composition-based card system:
- `Card`: Container
- `CardHeader`: Header section
- `CardTitle`: Title element
- `CardDescription`: Description text
- `CardContent`: Main content area
- `CardFooter`: Footer section

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>My Card</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>
```

#### Badge (`src/components/ui/badge.tsx`)
- **Variants**: default, secondary, destructive, outline, warning, success
- **Use**: Status indicators, tags, labels

```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="success">Confirmed</Badge>
```

#### Dialog (`src/components/ui/dialog.tsx`)
- **Components**:
  - `Dialog`: Main dialog container (uses native HTML dialog)
  - `DialogTrigger`: Trigger button
  - `DialogContent`: Dialog content wrapper
  - `DialogHeader`: Header section
  - `DialogTitle`: Title
  - `DialogDescription`: Description
  - `DialogFooter`: Footer for actions
  - `DialogClose`: Close button
- **Features**: Native HTML dialog element, Escape key dismissible, click-outside dismissible

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

#### Select (`src/components/ui/select.tsx`)
- **Props**:
  - `label`: Optional label
  - `options`: Array of {value, label} objects
  - `error`: Error styling
- **Features**: Forward ref, label support

```tsx
import { Select } from '@/components/ui/select';

<Select
  label="Destination"
  options={[
    { value: 'beach', label: 'Beach' },
    { value: 'mountain', label: 'Mountain' }
  ]}
/>
```

#### Chip (`src/components/ui/chip.tsx`)
Multi-select chip component
- **Props**:
  - `options`: Array of {value, label} objects
  - `selectedValues`: Array of selected values
  - `onChange`: Callback when selection changes
  - `disabled`: Disable all chips

```tsx
import { Chip } from '@/components/ui/chip';

const [selected, setSelected] = useState(['beach']);

<Chip
  options={[
    { value: 'beach', label: 'Beach' },
    { value: 'mountain', label: 'Mountain' }
  ]}
  selectedValues={selected}
  onChange={setSelected}
/>
```

#### DatePicker (`src/components/ui/date-picker.tsx`)
- **Props**:
  - `label`: Optional label
  - `minDate`: Minimum selectable date (ISO format)
  - `maxDate`: Maximum selectable date (ISO format)
  - `error`: Error styling
- **Features**: Native HTML5 date input with validation

```tsx
import { DatePicker } from '@/components/ui/date-picker';

<DatePicker
  label="Trip Start"
  minDate="2024-01-01"
  maxDate="2024-12-31"
/>
```

#### Progress (`src/components/ui/progress.tsx`)
- **Props**:
  - `value`: Current progress value
  - `max`: Maximum value (default: 100)
  - `label`: Optional label with percentage display
- **Features**: Animated bar, percentage display

```tsx
import { Progress } from '@/components/ui/progress';

<Progress value={65} max={100} label="Trip Planning" />
```

#### SlideOver (`src/components/ui/slide-over.tsx`)
Right-side panel component
- **Props**:
  - `open`: Control visibility
  - `onClose`: Callback when closed
  - `title`: Optional panel title
  - `children`: Panel content
- **Features**: Slides from right, Escape key dismissible, click-outside dismissible, body scroll lock

```tsx
import { SlideOver } from '@/components/ui/slide-over';

const [open, setOpen] = useState(false);

<SlideOver
  open={open}
  onClose={() => setOpen(false)}
  title="Details Panel"
>
  Your content here
</SlideOver>
```

#### Skeleton (`src/components/ui/skeleton.tsx`)
Loading placeholder component
- **Use**: Show content loading state
- **Features**: Pulse animation

```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton className="h-12 w-full" />
```

#### Tooltip (`src/components/ui/tooltip.tsx`)
Hover tooltip component
- **Props**:
  - `content`: Tooltip text
  - `side`: Position (top, right, bottom, left)
  - `children`: Trigger element
- **Features**: Hover activated, positioned arrow

```tsx
import { Tooltip } from '@/components/ui/tooltip';

<Tooltip content="Help text" side="top">
  <Button>Hover me</Button>
</Tooltip>
```

### Layout Components

#### Header (`src/components/layout/header.tsx`)
Navigation header with:
- Trip Planner logo/title (links to home)
- Navigation links (Home, Sources)
- Sign Out button (uses next-auth/react signOut)
- Mobile responsive (nav links hidden on mobile)

```tsx
import { Header } from '@/components/layout/header';

<Header />
```

#### AppShell (`src/components/layout/app-shell.tsx`)
Main layout wrapper
- Includes Header
- Provides flex container for main content
- Mobile responsive

```tsx
import { AppShell } from '@/components/layout/app-shell';

<AppShell>
  <YourPageContent />
</AppShell>
```

## Utility Functions

### cn() - Class Name Merge
Located in `src/lib/utils.ts`

Merges multiple classname strings, filtering out empty/falsy values:

```tsx
import { cn } from '@/lib/utils';

cn('base-class', condition && 'conditional-class', undefined) 
// Returns: 'base-class conditional-class'
```

## Design System

### Colors
- **Primary**: Blue-600 (#2563eb)
- **Success**: Green (#22c55e)
- **Warning**: Yellow (#eab308)
- **Destructive**: Red (#ef4444)
- **Background**: White (#ffffff) / Dark (#0a0a0a)
- **Borders**: Gray-300 (#d1d5db)

### Spacing
Uses Tailwind's standard spacing scale (4px increments)

### Typography
- **Font**: Geist Sans (primary), Geist Mono (code)
- **Base size**: 16px (1rem)
- **Line height**: 1.5

### Responsive Design
Mobile-first approach using Tailwind breakpoints:
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

## Print Styles

All components respect print media queries defined in `src/app/globals.css`:
- Navigation hidden on print
- Page breaks supported
- Shadows removed
- Optimized for PDF export

## Component Quality Standards

✓ **TypeScript**: Full type safety
✓ **Accessibility**: WCAG compliant focus states, ARIA labels where needed
✓ **Responsive**: Mobile-first design
✓ **Tailwind CSS**: No external CSS-in-JS libraries
✓ **Forward Refs**: Proper React forwardRef implementation
✓ **Class Merging**: Using cn() utility for safe style composition
✓ **Disabled States**: Proper styling and interaction prevention
✓ **Loading States**: Spinners and loading indicators
✓ **Error States**: Visual error feedback

## Demo Page

Visit `/demo` to see all components in action with various states and configurations.

## File Structure

```
src/
├── components/
│   ├── index.ts                 # Component exports
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── chip.tsx
│   │   ├── date-picker.tsx
│   │   ├── progress.tsx
│   │   ├── slide-over.tsx
│   │   ├── skeleton.tsx
│   │   └── tooltip.tsx
│   └── layout/
│       ├── header.tsx
│       └── app-shell.tsx
├── lib/
│   └── utils.ts                 # Utility functions (cn)
└── app/
    ├── globals.css              # Global styles
    ├── layout.tsx               # Root layout with SessionProvider
    └── demo/
        └── page.tsx             # Component showcase page
```

## Usage Example

```tsx
'use client';

import { useState } from 'react';
import { AppShell, Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components';

export default function MyPage() {
  const [formData, setFormData] = useState('');

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Create Trip</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Trip Name"
              value={formData}
              onChange={(e) => setFormData(e.target.value)}
            />
            <Button onClick={() => console.log('Creating trip')}>
              Create Trip
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
```

## Notes

- All components are client-safe and work with Next.js 14's App Router
- The `dialog.tsx` uses native HTML `<dialog>` element for better semantics
- Components are built without shadcn/ui to keep the codebase lean and customizable
- All styles use Tailwind CSS classes for consistency and easy theming
