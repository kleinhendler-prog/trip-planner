'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import { SlideOver } from '@/components/ui/slide-over';
import { Tooltip } from '@/components/ui/tooltip';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AppShell } from '@/components/layout/app-shell';

export default function DemoPage() {
  const [slideOpen, setSlideOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChips, setSelectedChips] = useState<(string | number)[]>(['beach']);
  const [isLoading, setIsLoading] = useState(false);

  const chipOptions = [
    { value: 'beach', label: 'Beach' },
    { value: 'mountain', label: 'Mountain' },
    { value: 'city', label: 'City' },
    { value: 'nature', label: 'Nature' },
  ];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-12">Component Library Demo</h1>

        {/* Buttons */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Various button variants and sizes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">+</Button>
            </div>

            <div className="flex gap-4">
              <Button isLoading>Loading State</Button>
              <Button disabled>Disabled</Button>
            </div>
          </CardContent>
        </Card>

        {/* Input */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>Text input with label and error states</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Full Name" placeholder="Enter your name" />
            <Input label="Email" type="email" placeholder="your@email.com" error={true} />
            <Input label="Disabled" disabled placeholder="Cannot edit" />
          </CardContent>
        </Card>

        {/* Date Picker */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Date Picker</CardTitle>
            <CardDescription>Select dates with min/max constraints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DatePicker label="Trip Start Date" />
            <DatePicker label="Trip End Date" minDate={new Date().toISOString().split('T')[0]} />
          </CardContent>
        </Card>

        {/* Badges */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Status indicators with different variants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="success">Success</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>Progress bars with labels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Progress value={25} label="Trip Planning" max={100} />
            <Progress value={65} label="Booking Flights" max={100} />
            <Progress value={100} label="Itinerary Ready" max={100} />
          </CardContent>
        </Card>

        {/* Chip */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Chip Selection</CardTitle>
            <CardDescription>Multi-select chips for filtering</CardDescription>
          </CardHeader>
          <CardContent>
            <Chip
              options={chipOptions}
              selectedValues={selectedChips}
              onChange={setSelectedChips}
            />
            <p className="mt-4 text-sm text-gray-600">
              Selected: {selectedChips.join(', ') || 'None'}
            </p>
          </CardContent>
        </Card>

        {/* Tooltip */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Tooltip</CardTitle>
            <CardDescription>Hover to see tooltip content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tooltip content="This is a tooltip" side="top">
              <Button variant="outline">Hover me</Button>
            </Tooltip>
          </CardContent>
        </Card>

        {/* Skeleton */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Skeleton Loader</CardTitle>
            <CardDescription>Loading state placeholder</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>

        {/* Dialog */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Dialog</CardTitle>
            <CardDescription>Modal dialog component</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog Title</DialogTitle>
                  <DialogDescription>
                    This is a dialog component for important confirmations or information.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-gray-600">Dialog content goes here.</p>
                </div>
                <DialogFooter>
                  <DialogClose onClick={() => setDialogOpen(false)}>Cancel</DialogClose>
                  <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Slide-over */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Slide-over Panel</CardTitle>
            <CardDescription>Right-sliding panel for additional content</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setSlideOpen(true)}>Open Slide-over</Button>
          </CardContent>
        </Card>

        <SlideOver
          open={slideOpen}
          onClose={() => setSlideOpen(false)}
          title="Slide-over Panel"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This is a slide-over panel that slides in from the right side. Press Escape or click outside to close.
            </p>
            <div className="space-y-3">
              <Input placeholder="Enter something..." />
              <Button className="w-full">Submit</Button>
            </div>
          </div>
        </SlideOver>
      </div>
    </AppShell>
  );
}
