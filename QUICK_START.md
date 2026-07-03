# Quick Start Guide - Component Library

## Importing Components

### Method 1: From Component Index (Recommended)
```tsx
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components';
```

### Method 2: Direct Import
```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';
```

## Common Patterns

### Page with Header and Content
```tsx
'use client';

import { AppShell, Card, CardHeader, CardTitle, CardContent, Button } from '@/components';

export default function MyPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <Button>Get Started</Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
```

### Form with Validation
```tsx
'use client';

import { useState } from 'react';
import { Input, Button, Badge } from '@/components';

export default function TripForm() {
  const [tripName, setTripName] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (!tripName) {
      setError(true);
      return;
    }
    // Submit logic
  };

  return (
    <div className="space-y-4 max-w-md">
      <Input
        label="Trip Name"
        value={tripName}
        onChange={(e) => setTripName(e.target.value)}
        error={error}
      />
      {error && <Badge variant="destructive">Name is required</Badge>}
      <Button onClick={handleSubmit} className="w-full">
        Create Trip
      </Button>
    </div>
  );
}
```

### Multi-Select Filtering
```tsx
'use client';

import { useState } from 'react';
import { Chip } from '@/components';

export default function DestinationFilter() {
  const [selected, setSelected] = useState<(string | number)[]>([]);

  const destinations = [
    { value: 'beach', label: 'Beach' },
    { value: 'mountain', label: 'Mountain' },
    { value: 'city', label: 'City' },
    { value: 'nature', label: 'Nature' },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Select Trip Types</h3>
      <Chip
        options={destinations}
        selectedValues={selected}
        onChange={setSelected}
      />
    </div>
  );
}
```

### Modal/Dialog
```tsx
'use client';

import { useState } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTrigger, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components';

export default function ConfirmDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Delete Trip</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Are you sure?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose onClick={() => setOpen(false)}>
            Cancel
          </DialogClose>
          <Button 
            variant="destructive"
            onClick={() => {
              // Delete logic
              setOpen(false);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Date Range Selection
```tsx
'use client';

import { useState } from 'react';
import { DatePicker, Button } from '@/components';

export default function TripDatePicker() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <div className="space-y-4 max-w-md">
      <DatePicker
        label="Start Date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        minDate={new Date().toISOString().split('T')[0]}
      />
      <DatePicker
        label="End Date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        minDate={startDate}
      />
      <Button className="w-full">
        Search Trips
      </Button>
    </div>
  );
}
```

### Progress Tracking
```tsx
'use client';

import { Progress } from '@/components';

export default function TripProgress() {
  return (
    <div className="space-y-4">
      <Progress value={30} label="Flight Booking" max={100} />
      <Progress value={65} label="Hotel Selection" max={100} />
      <Progress value={100} label="Itinerary Ready" max={100} />
    </div>
  );
}
```

### Slide-Over Panel
```tsx
'use client';

import { useState } from 'react';
import { Button, SlideOver, Input } from '@/components';

export default function TripFilters() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Show Filters</Button>
      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title="Filter Trips"
      >
        <div className="space-y-4">
          <Input label="Budget Max" type="number" placeholder="$5000" />
          <Input label="Duration" type="text" placeholder="7-10 days" />
          <Button className="w-full">Apply Filters</Button>
        </div>
      </SlideOver>
    </>
  );
}
```

## Component Props Reference

### Button
```tsx
<Button
  variant="default" | "secondary" | "outline" | "destructive" | "ghost" | "link"
  size="default" | "sm" | "lg" | "icon"
  isLoading={false}
  disabled={false}
  onClick={() => {}}
>
  Label
</Button>
```

### Input
```tsx
<Input
  label="Field Label"
  type="text" | "email" | "password" | "number"
  placeholder="Placeholder text"
  error={false}
  disabled={false}
  onChange={() => {}}
/>
```

### Chip
```tsx
<Chip
  options={[
    { value: 'id', label: 'Display' }
  ]}
  selectedValues={['id']}
  onChange={(values) => {}}
  disabled={false}
/>
```

### DatePicker
```tsx
<DatePicker
  label="Select Date"
  minDate="2024-01-01"
  maxDate="2024-12-31"
  value="2024-06-15"
  onChange={() => {}}
/>
```

### Dialog
```tsx
<Dialog open={true} onOpenChange={(open) => {}}>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <DialogClose>Close</DialogClose>
      <Button>Action</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### SlideOver
```tsx
<SlideOver
  open={true}
  onClose={() => {}}
  title="Panel Title"
>
  {/* Content */}
</SlideOver>
```

## Tips

1. **Always use `'use client'` directive** at the top of pages that use interactive components
2. **Use responsive classes**: `hidden sm:block`, `max-w-2xl`, `px-4 sm:px-6`
3. **Combine components with Tailwind**: `<Button className="w-full">`
4. **Check the demo page** at `/demo` for more examples
5. **ForwardRef support**: All input components support `ref` prop
6. **className merging**: Use `cn()` utility to safely merge classes

## Troubleshooting

**Missing "use client"?**
- Add `'use client';` at the top of files using interactive components like Dialog, SlideOver, Chip

**Styles not applying?**
- Ensure `globals.css` is imported in root layout
- Check that Tailwind CSS is properly configured

**ForwardRef not working?**
- Components already have forwardRef set up, just pass `ref` prop

**Dialog not opening?**
- Make sure you're passing `open={true}` and `onOpenChange={setOpen}` props

## Documentation

For detailed component documentation, see `COMPONENTS.md`
