/**
 * Utility Functions for Trip Planner
 * Common helpers for formatting, URLs, and transformations
 */

import { clsx, type ClassValue } from 'clsx';
import { format } from 'date-fns';
import crypto from 'crypto';

// ============= Class Name Utilities =============

/**
 * Merge multiple class names conditionally
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// ============= Date Formatting =============

/**
 * Format date to readable string (e.g., "Mon, Apr 12, 2026")
 */
export function formatDate(
  date: string | Date,
  formatStr: string = 'EEE, MMM dd, yyyy'
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatStr);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date for input type="date" (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

/**
 * Format time from HH:MM string to readable format
 */
export function formatTime(timeStr: string): string {
  try {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const min = parseInt(minutes, 10);

    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
  } catch {
    return timeStr;
  }
}

/**
 * Get duration in hours and minutes format
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// ============= Currency Formatting =============

/**
 * Format number as currency
 */
export function formatCurrency(
  amount: number | undefined,
  currency: string = 'USD'
): string {
  if (amount === undefined || amount === null) return 'N/A';

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

/**
 * Format price level (1-5) to currency symbols
 */
export function formatPriceLevel(level: number | undefined): string {
  if (!level) return 'N/A';

  const symbols = ['$', '$$', '$$$', '$$$$', '$$$$$'];
  return symbols[Math.min(Math.max(level - 1, 0), 4)];
}

/**
 * Calculate total cost for a trip
 */
export function calculateTripCost(
  hotelNightlyRate: number | undefined,
  nights: number,
  activitiesTotal: number = 0,
  mealsTotal: number = 0,
  transitTotal: number = 0
): number {
  const hotelCost = (hotelNightlyRate || 0) * nights;
  return hotelCost + activitiesTotal + mealsTotal + transitTotal;
}

// ============= URL Building Utilities =============

/**
 * Build Google Maps URL for a location
 */
export function buildGoogleMapsUrl(
  lat?: number,
  lng?: number,
  query?: string
): string {
  const baseUrl = 'https://maps.google.com/maps';

  if (lat && lng) {
    return `${baseUrl}?q=${lat},${lng}`;
  }

  if (query) {
    return `${baseUrl}?q=${encodeURIComponent(query)}`;
  }

  return baseUrl;
}

/**
 * Build Booking.com URL for hotel search
 */
export function buildBookingComUrl(
  destination: string,
  checkInDate?: string,
  checkOutDate?: string
): string {
  const baseUrl = 'https://www.booking.com/searchresults.html';
  const params = new URLSearchParams({
    ss: destination,
  });

  if (checkInDate) {
    params.append('checkin', checkInDate);
  }

  if (checkOutDate) {
    params.append('checkout', checkOutDate);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Build GetYourGuide URL for activities search
 */
export function buildGetYourGuideUrl(destination: string): string {
  return `https://www.getyourguide.com/${encodeURIComponent(destination)}/activities.html`;
}

/**
 * Build TheFork URL for restaurant search
 */
export function buildTheForkUrl(destination: string): string {
  return `https://www.thefork.com/${destination}/restaurants`;
}

/**
 * Build Google Places URL for place
 */
export function buildGooglePlacesUrl(googlePlacesId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${googlePlacesId}`;
}

/**
 * Build YouTube search URL
 */
export function buildYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * Build Spotify search URL
 */
export function buildSpotifySearchUrl(query: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

// ============= Authentication Utilities =============

/**
 * Generate a secure token for email verification or password reset
 */
export function generateEmailToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Hash a value (for verification tokens)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============= Data Transformation =============

/**
 * Calculate days between two dates
 */
export function calculateDaysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((end.getTime() - start.getTime()) / msPerDay) + 1;
}

/**
 * Generate date range array
 */
export function generateDateRange(startDate: string | Date, endDate: string | Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(typeof startDate === 'string' ? startDate : startDate.toISOString());
  const end = new Date(typeof endDate === 'string' ? endDate : endDate.toISOString());

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Sort activities by start time
 */
export function sortActivitiesByTime<T extends { startTime: string }>(
  activities: T[]
): T[] {
  return [...activities].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });
}

/**
 * Check if two time ranges overlap
 */
export function doTimeRangesOverlap(
  start1: string,
  end1: string | undefined,
  start2: string,
  end2: string | undefined
): boolean {
  if (!end1 || !end2) return false;

  return start1 < end2 && start2 < end1;
}

/**
 * Parse time string to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// ============= Validation Utilities =============

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDateFormat(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTimeFormat(timeStr: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeStr);
}

/**
 * Check if string is valid JSON
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// ============= String Utilities =============

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength - 3)}...`;
}

/**
 * Convert kebab-case to Title Case
 */
export function kebabToTitleCase(str: string): string {
  return str
    .split('-')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Slugify a string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============= Color Utilities =============

/**
 * Convert hex color to RGB
 */
export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Get contrasting text color (black or white) for a background
 */
export function getContrastingTextColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#000000';

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// ============= Array Utilities =============

/**
 * Remove duplicates from array
 */
export function removeDuplicates<T>(arr: T[], key?: (item: T) => string): T[] {
  if (key) {
    const seen = new Set<string>();
    return arr.filter((item) => {
      const k = key(item);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  return Array.from(new Set(arr));
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Group array items by key
 */
export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce(
    (result, item) => {
      const group = key(item);
      if (!result[group]) result[group] = [];
      result[group].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
}

// ============= Type Guards =============

/**
 * Check if value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}
