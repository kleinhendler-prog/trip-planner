'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Select } from '@/components/ui/select';
import { Chip } from '@/components/ui/chip';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import {
  INTERESTS,
  DISLIKES,
  HOTEL_PREFERENCES,
  TRIP_TYPES,
  GENERATION_STEPS,
} from '@/lib/constants';
import type {
  Interest,
  Dislike,
  HotelPreference,
  TripType,
  GenerationProgress,
  Trip,
} from '@/types';

const STEPS = [
  { id: 1, title: 'Destination & Dates' },
  { id: 2, title: 'Travelers' },
  { id: 3, title: 'Interests' },
  { id: 4, title: 'Preferences' },
  { id: 5, title: 'Review & Generate' },
];

type TripStyle = 'single_city' | 'area' | 'road_trip' | 'multi_segment';

interface Segment {
  id: string;
  type: 'single_city' | 'area' | 'road_trip';
  destination: string;
  startPoint: string;
  endPoint: string;
  maxDriveHours: number;
  startDate: string;
  endDate: string;
}

interface FormData {
  tripStyle: TripStyle;
  destination: string;
  startPoint: string;
  endPoint: string;
  maxDriveHours: number;
  startDate: string;
  endDate: string;
  adultsCount: number;
  childrenAges: number[];
  groupDescription: string;
  interests: Interest[];
  dislikes: Dislike[];
  dislikesText: string;
  hotelPreference: HotelPreference;
  tripType: TripType;
  currency: 'EUR' | 'USD';
  dailyBudget?: number;
  segments: Segment[];
}

let segmentCounter = 0;
function newSegment(startDate?: string): Segment {
  segmentCounter++;
  return {
    id: `seg-${segmentCounter}`,
    type: 'single_city',
    destination: '',
    startPoint: '',
    endPoint: '',
    maxDriveHours: 4,
    startDate: startDate || '',
    endDate: '',
  };
}

export default function TripCreationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    tripStyle: 'single_city',
    destination: '',
    startPoint: '',
    endPoint: '',
    maxDriveHours: 4,
    startDate: '',
    endDate: '',
    adultsCount: 1,
    childrenAges: [],
    groupDescription: '',
    interests: [],
    dislikes: [],
    dislikesText: '',
    hotelPreference: 'comfort',
    tripType: 'cultural',
    currency: 'USD',
    segments: [],
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (formData.tripStyle === 'multi_segment') {
        if (formData.segments.length < 2) {
          newErrors.segments = 'Add at least 2 segments for a multi-segment trip';
        } else {
          formData.segments.forEach((seg, i) => {
            if (seg.type === 'road_trip') {
              if (!seg.startPoint) newErrors[`seg${i}start`] = `Segment ${i + 1}: starting point required`;
              if (!seg.endPoint) newErrors[`seg${i}end`] = `Segment ${i + 1}: ending point required`;
            } else {
              if (!seg.destination) newErrors[`seg${i}dest`] = `Segment ${i + 1}: destination required`;
            }
            if (!seg.startDate) newErrors[`seg${i}sdate`] = `Segment ${i + 1}: start date required`;
            if (!seg.endDate) newErrors[`seg${i}edate`] = `Segment ${i + 1}: end date required`;
          });
        }
      } else if (formData.tripStyle === 'road_trip') {
        if (!formData.startPoint) newErrors.startPoint = 'Starting point is required';
        if (!formData.endPoint) newErrors.endPoint = 'Destination is required';
        if (!formData.startDate) newErrors.startDate = 'Start date is required';
        if (!formData.endDate) newErrors.endDate = 'End date is required';
      } else {
        if (!formData.destination) newErrors.destination = 'Destination is required';
        if (!formData.startDate) newErrors.startDate = 'Start date is required';
        if (!formData.endDate) newErrors.endDate = 'End date is required';
      }
      if (formData.tripStyle !== 'multi_segment') {
        if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
          newErrors.endDate = 'End date must be after start date';
        }
      }
    }

    if (step === 2) {
      if (formData.adultsCount < 1) newErrors.adultsCount = 'At least 1 adult is required';
      if (formData.adultsCount > 10) newErrors.adultsCount = 'Maximum 10 adults';
    }

    if (step === 4) {
      if (!formData.hotelPreference) newErrors.hotelPreference = 'Hotel preference is required';
      if (!formData.tripType) newErrors.tripType = 'Trip type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    if (!validateStep(5)) return;

    setIsGenerating(true);
    setGenerationProgress({ status: 'pending', progress: 0, jobId: '' });

    try {
      // Build trip data based on style
      let destinationForTrip: string;
      let startDate: string;
      let endDate: string;
      const tripOverrides: any = {};

      if (formData.tripStyle === 'multi_segment') {
        const segs = formData.segments;
        destinationForTrip = segs.map(s => s.type === 'road_trip' ? `${s.startPoint} → ${s.endPoint}` : s.destination).join(' → ');
        startDate = segs[0].startDate;
        endDate = segs[segs.length - 1].endDate;
        tripOverrides.segments = segs.map(s => ({
          type: s.type,
          destination: s.type === 'road_trip' ? `${s.startPoint} → ${s.endPoint}` : s.destination,
          startDate: s.startDate,
          endDate: s.endDate,
          startPoint: s.startPoint,
          endPoint: s.endPoint,
          maxDriveHours: s.maxDriveHours,
        }));
      } else if (formData.tripStyle === 'road_trip') {
        destinationForTrip = `${formData.startPoint} → ${formData.endPoint}`;
        startDate = formData.startDate;
        endDate = formData.endDate;
        tripOverrides.startPoint = formData.startPoint;
        tripOverrides.endPoint = formData.endPoint;
        tripOverrides.maxDriveHours = formData.maxDriveHours;
      } else {
        destinationForTrip = formData.destination;
        startDate = formData.startDate;
        endDate = formData.endDate;
      }

      const createResponse = await apiClient.post<Trip>('/trips', {
        title: `Trip to ${destinationForTrip}`,
        destination: destinationForTrip,
        startDate,
        endDate,
        travelers: formData.adultsCount + formData.childrenAges.length,
        tripType: formData.tripType,
        tripStyle: formData.tripStyle === 'multi_segment' ? 'multi_segment' : formData.tripStyle,
        tripOverrides,
        preferences: {
          interests: formData.interests,
          dislikes: formData.dislikes,
          hotelPreference: formData.hotelPreference,
        },
      });

      if (!createResponse.success || !createResponse.data) {
        throw new Error('Failed to create trip');
      }

      const tripId = (createResponse.data as any).id || (createResponse.data as any).trip_id;

      // POST /api/trips runs generation synchronously; redirect to the trip page
      router.push(`/trips/${tripId}`);
    } catch (err) {
      setIsGenerating(false);
      setErrors({
        generation: err instanceof Error ? err.message : 'Failed to start generation',
      });
    }
  };

  const interestOptions = Object.entries(INTERESTS).map(([key, val]) => ({
    value: key,
    label: `${val.icon} ${val.label}`,
  }));

  const dislikeOptions = Object.entries(DISLIKES).map(([key, val]) => ({
    value: key,
    label: `${val.icon} ${val.label}`,
  }));

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <AppShell>
      <div className="min-h-screen py-8" style={{ background: 'var(--color-background)' }}>
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between items-center relative mb-3">
              {/* Background line */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-[var(--color-surface-variant)] -z-10 rounded-full"></div>
              {/* Active line */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary-gradient -z-10 rounded-full transition-all duration-500" style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}></div>
              {STEPS.map((step) => (
                <div key={step.id} className="flex flex-col items-center gap-1 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step.id < currentStep
                      ? 'bg-[var(--color-primary)] text-white'
                      : step.id === currentStep
                        ? 'bg-[var(--color-primary)] text-white shadow-level-2'
                        : 'bg-white text-[var(--color-on-surface-variant)] border-2 border-[var(--color-surface-variant)]'
                  }`}>
                    {step.id < currentStep ? (
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    ) : step.id}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`text-xs font-medium text-center transition-colors ${
                    currentStep === step.id
                      ? 'text-[var(--color-primary)]'
                      : step.id < currentStep
                        ? 'text-[var(--color-on-surface-variant)]'
                        : 'text-[var(--color-outline)]'
                  }`}
                  style={{ width: `${100 / STEPS.length}%` }}
                >
                  {step.title}
                </div>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Trip Style + Destination & Dates */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-label-mono text-[var(--color-on-surface-variant)] mb-3">
                      What kind of trip is this?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { v: 'single_city' as const, icon: 'location_city', label: 'Single city', desc: 'Stay in one place' },
                        { v: 'area' as const, icon: 'map', label: 'Region / area', desc: 'e.g., Tuscany' },
                        { v: 'road_trip' as const, icon: 'directions_car', label: 'Road trip', desc: 'Drive A to B' },
                        { v: 'multi_segment' as const, icon: 'flight_takeoff', label: 'Multi-segment', desc: 'Chain trip types' },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => {
                            const update: Partial<FormData> = { tripStyle: opt.v };
                            if (opt.v === 'multi_segment' && formData.segments.length === 0) {
                              update.segments = [newSegment(), newSegment()];
                            }
                            setFormData({ ...formData, ...update });
                          }}
                          className={`p-4 rounded-[16px] text-center transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                            formData.tripStyle === opt.v
                              ? 'border-2 border-[var(--color-primary)] bg-[rgba(192,193,255,0.2)] shadow-sm'
                              : 'border border-[var(--color-outline-variant)] bg-[var(--color-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-container-low)]'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-3xl ${formData.tripStyle === opt.v ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]'}`} style={formData.tripStyle === opt.v ? { fontVariationSettings: "'FILL' 1" } : undefined}>{opt.icon}</span>
                          <span className={`font-bold text-sm ${formData.tripStyle === opt.v ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface)]'}`}>{opt.label}</span>
                          <span className="text-xs text-[var(--color-on-surface-variant)]">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.tripStyle === 'single_city' && (
                    <Input
                      label="Destination"
                      placeholder="e.g., Paris, Tokyo, New York"
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      error={!!errors.destination}
                    />
                  )}

                  {formData.tripStyle === 'area' && (
                    <>
                      <Input
                        label="Region or area"
                        placeholder="e.g., Tuscany, Scottish Highlands, Japanese Alps"
                        value={formData.destination}
                        onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                        error={!!errors.destination}
                      />
                      <p className="text-xs text-[var(--color-on-surface-variant)] -mt-3">
                        We&apos;ll propose 2-3 overnight bases so each day clusters around where you sleep.
                      </p>
                    </>
                  )}

                  {formData.tripStyle === 'road_trip' && (
                    <>
                      <Input
                        label="Starting point"
                        placeholder="e.g., San Francisco, Rome, Reykjavík"
                        value={formData.startPoint}
                        onChange={(e) => setFormData({ ...formData, startPoint: e.target.value, destination: e.target.value })}
                        error={!!errors.startPoint}
                      />
                      <Input
                        label="Ending point"
                        placeholder="e.g., Los Angeles, Naples, Akureyri"
                        value={formData.endPoint}
                        onChange={(e) => setFormData({ ...formData, endPoint: e.target.value })}
                        error={!!errors.endPoint}
                      />
                      <div>
                        <label className="block text-label-mono text-[var(--color-on-surface-variant)] mb-1.5">
                          Max driving per day: {formData.maxDriveHours} hours
                        </label>
                        <input
                          type="range"
                          min={2}
                          max={10}
                          step={1}
                          value={formData.maxDriveHours}
                          onChange={(e) => setFormData({ ...formData, maxDriveHours: parseInt(e.target.value) })}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-[var(--color-on-surface-variant)]">
                          <span>2h (scenic)</span>
                          <span>10h (long hauls)</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Multi-segment builder */}
                  {formData.tripStyle === 'multi_segment' && (
                    <div className="space-y-4">
                      <p className="text-sm text-[var(--color-on-surface-variant)]">
                        Chain multiple trip types together. Example: 3 days in Rome → road trip to Tuscany → 4 days exploring Tuscany.
                      </p>

                      {formData.segments.map((seg, si) => {
                        const updateSeg = (patch: Partial<Segment>) => {
                          const newSegs = [...formData.segments];
                          newSegs[si] = { ...newSegs[si], ...patch };
                          setFormData({ ...formData, segments: newSegs });
                        };
                        return (
                          <div key={seg.id} className="p-4 border border-[var(--color-surface-dim)] rounded-[16px] space-y-3 relative bg-[var(--color-surface-container-lowest)] shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-label-mono text-[var(--color-on-surface-variant)] font-bold">Segment {si + 1}</span>
                              {formData.segments.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, segments: formData.segments.filter((_, i) => i !== si) })}
                                  className="text-[var(--color-error)] text-xs hover:underline"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            {/* Segment type */}
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { v: 'single_city' as const, label: '🏙️ City' },
                                { v: 'area' as const, label: '🗺️ Area' },
                                { v: 'road_trip' as const, label: '🚗 Road trip' },
                              ].map((opt) => (
                                <button
                                  key={opt.v}
                                  type="button"
                                  onClick={() => updateSeg({ type: opt.v })}
                                  className={`py-1.5 px-3 rounded-full text-xs font-medium border transition-all duration-200 ${
                                    seg.type === opt.v ? 'border-[var(--color-primary)] bg-[var(--color-primary-fixed-dim)] text-[var(--color-primary)]' : 'border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-container-low)]'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            {/* Segment destination */}
                            {seg.type === 'road_trip' ? (
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  label="From"
                                  placeholder="Start city"
                                  value={seg.startPoint}
                                  onChange={(e) => updateSeg({ startPoint: e.target.value, destination: e.target.value })}
                                  error={!!errors[`seg${si}start`]}
                                />
                                <Input
                                  label="To"
                                  placeholder="End city"
                                  value={seg.endPoint}
                                  onChange={(e) => updateSeg({ endPoint: e.target.value })}
                                  error={!!errors[`seg${si}end`]}
                                />
                              </div>
                            ) : (
                              <Input
                                label={seg.type === 'area' ? 'Region' : 'City'}
                                placeholder={seg.type === 'area' ? 'e.g., Tuscany' : 'e.g., Rome'}
                                value={seg.destination}
                                onChange={(e) => updateSeg({ destination: e.target.value })}
                                error={!!errors[`seg${si}dest`]}
                              />
                            )}
                            {/* Segment dates */}
                            <div className="grid grid-cols-2 gap-2">
                              <DatePicker
                                label="Start"
                                value={seg.startDate}
                                onChange={(e) => updateSeg({ startDate: e.target.value })}
                                minDate={si > 0 ? formData.segments[si - 1].endDate || new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                                error={!!errors[`seg${si}sdate`]}
                              />
                              <DatePicker
                                label="End"
                                value={seg.endDate}
                                onChange={(e) => updateSeg({ endDate: e.target.value })}
                                minDate={seg.startDate || new Date().toISOString().split('T')[0]}
                                error={!!errors[`seg${si}edate`]}
                              />
                            </div>
                            {seg.type === 'road_trip' && (
                              <div>
                                <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
                                  Max driving/day: {seg.maxDriveHours}h
                                </label>
                                <input
                                  type="range"
                                  min={2} max={10} step={1}
                                  value={seg.maxDriveHours}
                                  onChange={(e) => updateSeg({ maxDriveHours: parseInt(e.target.value) })}
                                  className="w-full"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const lastSeg = formData.segments[formData.segments.length - 1];
                          setFormData({
                            ...formData,
                            segments: [...formData.segments, newSegment(lastSeg?.endDate)],
                          });
                        }}
                        className="w-full"
                      >
                        + Add Segment
                      </Button>

                      {errors.segments && <p className="text-sm text-[var(--color-error)]">{errors.segments}</p>}
                      {Object.entries(errors).filter(([k]) => k.startsWith('seg')).map(([k, v]) => (
                        <p key={k} className="text-sm text-[var(--color-error)]">{v}</p>
                      ))}
                    </div>
                  )}

                  {/* Dates (non-multi-segment only) */}
                  {formData.tripStyle !== 'multi_segment' && (
                    <>
                      <DatePicker
                        label="Start Date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        minDate={new Date().toISOString().split('T')[0]}
                        error={!!errors.startDate}
                      />
                      <DatePicker
                        label="End Date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        minDate={formData.startDate || new Date().toISOString().split('T')[0]}
                        error={!!errors.endDate}
                      />
                    </>
                  )}

                  {errors.destination && <p className="text-sm text-[var(--color-error)]">{errors.destination}</p>}
                  {errors.startPoint && <p className="text-sm text-[var(--color-error)]">{errors.startPoint}</p>}
                  {errors.endPoint && <p className="text-sm text-[var(--color-error)]">{errors.endPoint}</p>}
                  {errors.startDate && <p className="text-sm text-[var(--color-error)]">{errors.startDate}</p>}
                  {errors.endDate && <p className="text-sm text-[var(--color-error)]">{errors.endDate}</p>}
                </div>
              )}

              {/* Step 2: Travelers */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-label-mono text-[var(--color-on-surface-variant)] mb-1.5">
                      Number of Adults (1-10)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.adultsCount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          adultsCount: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)),
                        })
                      }
                      className="flex h-11 w-full rounded-[12px] border border-[var(--color-outline)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-fixed)] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-label-mono text-[var(--color-on-surface-variant)] mb-1.5">
                      Children Ages (0-17)
                    </label>
                    <div className="space-y-2">
                      {formData.childrenAges.map((age, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            max="17"
                            value={age}
                            onChange={(e) => {
                              const newAges = [...formData.childrenAges];
                              newAges[idx] = parseInt(e.target.value) || 0;
                              setFormData({ ...formData, childrenAges: newAges });
                            }}
                            className="flex h-11 flex-1 rounded-[12px] border border-[var(--color-outline)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-fixed)] transition-all"
                            placeholder="Age"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                childrenAges: formData.childrenAges.filter(
                                  (_, i) => i !== idx
                                ),
                              });
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          childrenAges: [...formData.childrenAges, 0],
                        })
                      }
                      className="mt-2"
                    >
                      Add Child
                    </Button>
                  </div>

                  <div>
                    <label className="block text-label-mono text-[var(--color-on-surface-variant)] mb-1.5">
                      About Your Group
                    </label>
                    <textarea
                      value={formData.groupDescription}
                      onChange={(e) =>
                        setFormData({ ...formData, groupDescription: e.target.value })
                      }
                      placeholder="e.g., family trip with kids, romantic getaway, team building"
                      className="flex min-h-24 w-full rounded-[12px] border border-[var(--color-outline)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-fixed)] transition-all"
                    />
                  </div>

                  {errors.adultsCount && (
                    <p className="text-sm text-[var(--color-error)]">{errors.adultsCount}</p>
                  )}
                </div>
              )}

              {/* Step 3: Interests */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-3">
                      What are you interested in?
                    </label>
                    <Chip
                      options={interestOptions}
                      selectedValues={formData.interests}
                      onChange={(selected) =>
                        setFormData({
                          ...formData,
                          interests: selected as Interest[],
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-3">
                      What would you like to avoid?
                    </label>
                    <Chip
                      options={dislikeOptions}
                      selectedValues={formData.dislikes}
                      onChange={(selected) =>
                        setFormData({
                          ...formData,
                          dislikes: selected as Dislike[],
                        })
                      }
                    />
                  </div>

                  <textarea
                    value={formData.dislikesText}
                    onChange={(e) =>
                      setFormData({ ...formData, dislikesText: e.target.value })
                    }
                    placeholder="Any other dislikes or restrictions?"
                    className="flex min-h-20 w-full rounded-[12px] border border-[var(--color-outline)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-fixed)] transition-all"
                  />
                </div>
              )}

              {/* Step 4: Preferences */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <Select
                    label="Hotel Preference"
                    value={formData.hotelPreference}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hotelPreference: e.target.value as HotelPreference,
                      })
                    }
                    options={Object.entries(HOTEL_PREFERENCES).map(([key, val]) => ({
                      value: key,
                      label: `${val.icon} ${val.label}`,
                    }))}
                    error={!!errors.hotelPreference}
                  />

                  <Select
                    label="Trip Type"
                    value={formData.tripType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tripType: e.target.value as TripType,
                      })
                    }
                    options={Object.entries(TRIP_TYPES).map(([key, val]) => ({
                      value: key,
                      label: `${val.icon} ${val.label}`,
                    }))}
                    error={!!errors.tripType}
                  />

                  <Select
                    label="Currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currency: e.target.value as 'EUR' | 'USD',
                      })
                    }
                    options={[
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'EUR', label: 'EUR (€)' },
                    ]}
                  />

                  <Input
                    label="Daily Budget Target (Optional)"
                    type="number"
                    placeholder="e.g., 150"
                    value={formData.dailyBudget || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dailyBudget: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />

                  {errors.hotelPreference && (
                    <p className="text-sm text-[var(--color-error)]">{errors.hotelPreference}</p>
                  )}
                  {errors.tripType && (
                    <p className="text-sm text-[var(--color-error)]">{errors.tripType}</p>
                  )}
                </div>
              )}

              {/* Step 5: Review */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div className="grid gap-4 rounded-[16px] bg-[var(--color-surface-container-low)] p-5 border border-[var(--color-surface-variant)]">
                    <div>
                      <p className="text-label-mono text-[var(--color-outline)] uppercase tracking-wider text-xs">DESTINATION</p>
                      <p className="text-lg font-heading font-bold text-[var(--color-on-surface)]">
                        {formData.tripStyle === 'multi_segment'
                          ? formData.segments.map(s => s.type === 'road_trip' ? `${s.startPoint} → ${s.endPoint}` : s.destination).join(' → ')
                          : formData.tripStyle === 'road_trip'
                            ? `${formData.startPoint} → ${formData.endPoint}`
                            : formData.destination}
                      </p>
                      {formData.tripStyle === 'multi_segment' && (
                        <div className="mt-2 space-y-1">
                          {formData.segments.map((s, i) => (
                            <p key={i} className="text-xs text-[var(--color-on-surface-variant)]">
                              Segment {i + 1}: {s.type === 'road_trip' ? `🚗 ${s.startPoint} → ${s.endPoint}` : s.type === 'area' ? `🗺️ ${s.destination}` : `🏙️ ${s.destination}`} ({s.startDate} → {s.endDate})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-label-mono text-[var(--color-outline)] uppercase tracking-wider text-xs">START DATE</p>
                        <p className="text-sm font-medium text-[var(--color-on-surface)]">
                          {formData.tripStyle === 'multi_segment' ? formData.segments[0]?.startDate : formData.startDate}
                        </p>
                      </div>
                      <div>
                        <p className="text-label-mono text-[var(--color-outline)] uppercase tracking-wider text-xs">END DATE</p>
                        <p className="text-sm font-medium text-[var(--color-on-surface)]">
                          {formData.tripStyle === 'multi_segment' ? formData.segments[formData.segments.length - 1]?.endDate : formData.endDate}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-label-mono text-[var(--color-outline)] uppercase tracking-wider text-xs">TRAVELERS</p>
                        <p className="text-sm font-medium text-[var(--color-on-surface)]">
                          {formData.adultsCount} adults
                          {formData.childrenAges.length > 0 && `, ${formData.childrenAges.length} children`}
                        </p>
                      </div>
                      <div>
                        <p className="text-label-mono text-[var(--color-outline)] uppercase tracking-wider text-xs">TRIP TYPE</p>
                        <p className="text-sm font-medium text-[var(--color-on-surface)]">
                          {TRIP_TYPES[formData.tripType].label}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-label-mono text-[var(--color-outline)] uppercase tracking-wider text-xs mb-2">INTERESTS</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.interests.map((interest) => (
                          <Badge key={interest}>{INTERESTS[interest].label}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {errors.generation && (
                    <div className="rounded-[12px] bg-[var(--color-error-container)] p-3">
                      <p className="text-sm text-[var(--color-on-error-container)]">{errors.generation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-4 border-t border-[var(--color-surface-variant)] pt-6">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentStep === 1 || isGenerating}
                >
                  Back
                </Button>
                {currentStep < STEPS.length ? (
                  <Button
                    onClick={handleNext}
                    className="flex-1"
                    disabled={isGenerating}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    isLoading={isGenerating}
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Itinerary'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generation Progress Dialog */}
      <Dialog open={isGenerating} onOpenChange={(open) => !open && !isGenerating && setIsGenerating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generating Your Itinerary</DialogTitle>
            <DialogDescription>
              AI is creating your personalized trip plan...
            </DialogDescription>
          </DialogHeader>
          {generationProgress && (
            <div className="space-y-4">
              <Progress value={generationProgress.progress} />
              <div className="rounded-[12px] bg-[var(--color-surface-container-low)] p-4 border border-[var(--color-surface-variant)]">
                <p className="text-sm font-medium text-[var(--color-on-surface)]">
                  {generationProgress.currentStep
                    ? GENERATION_STEPS[generationProgress.currentStep]?.label ||
                      generationProgress.message
                    : 'Starting...'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
