/**
 * QA Simulator for SimpleItinerary
 * Validates generated itineraries for logical consistency, completeness, and quality.
 */

import type {
  SimpleItinerary,
  ItineraryDay,
  ItineraryActivity,
} from './simple-pipeline';

export interface QACheckResult {
  passed: boolean;
  issues: string[];   // Hard failures — should block or trigger re-generation
  warnings: string[]; // Soft issues — worth logging but not blocking
}

/* ── Helpers ────────────────────────────────────────────── */

/** Parse "HH:MM" → total minutes from midnight */
function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Parse duration strings like "2h", "1.5h", "45min", "1h30" → minutes */
function parseDuration(d: string): number {
  if (!d) return 0;
  const s = d.toLowerCase().trim();

  // "2h30" or "2h30min"
  const hm = s.match(/^(\d+(?:\.\d+)?)\s*h\s*(\d+)?/);
  if (hm) {
    const hours = parseFloat(hm[1]);
    const mins = hm[2] ? parseInt(hm[2], 10) : 0;
    return Math.round(hours * 60 + mins);
  }

  // "45min" or "45 min"
  const minOnly = s.match(/^(\d+)\s*min/);
  if (minOnly) return parseInt(minOnly[1], 10);

  // Plain number → assume minutes
  const plain = parseFloat(s);
  if (!isNaN(plain)) return Math.round(plain);

  return 0;
}

/** Parse cost string "€16" / "$25" / "15" → number */
function parseCost(c: string | undefined): number {
  if (!c) return 0;
  const n = parseFloat(c.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

/** Check if indices are consecutive (no gaps) */
function isConsecutive(indices: number[]): boolean {
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return false;
  }
  return true;
}

/* ── Individual Checks ──────────────────────────────────── */

/** Check 1: Every day has activities */
function checkEmptyDays(itinerary: SimpleItinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  itinerary.days.forEach((day) => {
    if (!day.activities || day.activities.length === 0) {
      issues.push(`Day ${day.dayNumber} (${day.date}) has no activities`);
    }
  });

  return { passed: issues.length === 0, issues, warnings };
}

/** Check 2: Each day has at least one meal */
function checkMeals(itinerary: SimpleItinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  itinerary.days.forEach((day) => {
    const meals = (day.activities || []).filter((a) => a.type === 'meal');
    if (meals.length === 0) {
      issues.push(`Day ${day.dayNumber} has no meals scheduled`);
    } else if (meals.length < 2) {
      warnings.push(
        `Day ${day.dayNumber} has only ${meals.length} meal — consider adding lunch/dinner`
      );
    }
  });

  return { passed: issues.length === 0, issues, warnings };
}

/** Check 3: No schedule overlaps */
function checkScheduleConflicts(itinerary: SimpleItinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  itinerary.days.forEach((day) => {
    const acts = [...(day.activities || [])].sort(
      (a, b) => parseTime(a.time) - parseTime(b.time)
    );

    for (let i = 0; i < acts.length - 1; i++) {
      const cur = acts[i];
      const next = acts[i + 1];
      const curEnd = parseTime(cur.time) + parseDuration(cur.duration);
      const nextStart = parseTime(next.time);

      if (curEnd > nextStart) {
        issues.push(
          `Day ${day.dayNumber}: "${cur.name}" ends at ${formatMins(curEnd)} but "${next.name}" starts at ${next.time}`
        );
      }
    }
  });

  return { passed: issues.length === 0, issues, warnings };
}

/** Check 4: Realistic activity durations */
function checkDurations(itinerary: SimpleItinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  itinerary.days.forEach((day) => {
    (day.activities || []).forEach((a) => {
      const mins = parseDuration(a.duration);
      if (mins < 15) {
        warnings.push(
          `Day ${day.dayNumber}: "${a.name}" is very short (${a.duration})`
        );
      }
      if (mins > 480) {
        warnings.push(
          `Day ${day.dayNumber}: "${a.name}" is very long (${a.duration})`
        );
      }
    });
  });

  return { passed: true, issues, warnings };
}

/** Check 5: Zigzag detection — same location area visited non-consecutively */
function checkZigzags(itinerary: SimpleItinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  itinerary.days.forEach((day) => {
    const locations: Record<string, number[]> = {};

    (day.activities || []).forEach((a, idx) => {
      const loc = a.location?.name || 'unknown';
      if (!locations[loc]) locations[loc] = [];
      locations[loc].push(idx);
    });

    Object.entries(locations).forEach(([loc, indices]) => {
      if (indices.length > 1 && !isConsecutive(indices)) {
        warnings.push(
          `Day ${day.dayNumber}: Multiple visits to "${loc}" with other stops in between (zigzagging)`
        );
      }
    });
  });

  return { passed: true, issues, warnings };
}

/** Check 6: Overly packed days */
function checkPacedDays(itinerary: SimpleItinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  itinerary.days.forEach((day) => {
    const acts = day.activities || [];
    if (acts.length > 8) {
      warnings.push(
        `Day ${day.dayNumber}: Very packed with ${acts.length} activities`
      );
    }

    // Check total active minutes
    const totalMins = acts.reduce((s, a) => s + parseDuration(a.duration), 0);
    const restMins = 16 * 60 - totalMins; // assume 16 waking hours
    if (restMins < 90) {
      warnings.push(
        `Day ${day.dayNumber}: Very little free time (only ${restMins} min rest)`
      );
    }
  });

  return { passed: true, issues, warnings };
}

/** Check 7: Reasonable hours (not too early / too late) */
function checkReasonableHours(itinerary: SimpleItinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  itinerary.days.forEach((day) => {
    (day.activities || []).forEach((a) => {
      const mins = parseTime(a.time);
      const hours = Math.floor(mins / 60);

      if (hours < 6) {
        warnings.push(
          `Day ${day.dayNumber}: "${a.name}" starts very early (${a.time})`
        );
      }
      if (hours > 22) {
        warnings.push(
          `Day ${day.dayNumber}: "${a.name}" starts very late (${a.time})`
        );
      }
    });
  });

  return { passed: true, issues, warnings };
}

/** Check 8: Missing coordinates */
function checkCoordinates(itinerary: SimpleItinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  itinerary.days.forEach((day) => {
    (day.activities || []).forEach((a) => {
      if (!a.location?.lat || !a.location?.lng) {
        issues.push(
          `Day ${day.dayNumber}: "${a.name}" is missing lat/lng coordinates`
        );
      }
    });
  });

  return { passed: issues.length === 0, issues, warnings };
}

/** Check 9: Missing required fields (reservationStatus, priority, info) */
function checkRequiredFields(itinerary: SimpleItinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  itinerary.days.forEach((day) => {
    (day.activities || []).forEach((a) => {
      if (!a.reservationStatus) {
        warnings.push(
          `Day ${day.dayNumber}: "${a.name}" missing reservationStatus`
        );
      }
      if (!a.priority) {
        warnings.push(
          `Day ${day.dayNumber}: "${a.name}" missing priority rating`
        );
      }
      if (!a.info) {
        warnings.push(
          `Day ${day.dayNumber}: "${a.name}" missing info (opening hours)`
        );
      }
      if (a.priority && a.priority >= 4 && !a.guideNarration) {
        warnings.push(
          `Day ${day.dayNumber}: "${a.name}" has priority ${a.priority} but no guideNarration`
        );
      }
    });
  });

  return { passed: true, issues, warnings };
}

/** Check 10: Transit info present for non-first activities */
function checkTransitInfo(itinerary: SimpleItinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  itinerary.days.forEach((day) => {
    (day.activities || []).forEach((a, idx) => {
      if (idx > 0 && !a.transitFromPrev) {
        warnings.push(
          `Day ${day.dayNumber}: "${a.name}" missing transitFromPrev`
        );
      }
    });
  });

  return { passed: true, issues, warnings };
}

/** Check 11: Cost tracking */
function checkCosts(itinerary: SimpleItinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  let totalCost = 0;
  let missingCosts = 0;

  itinerary.days.forEach((day) => {
    (day.activities || []).forEach((a) => {
      const cost = parseCost(a.estimatedCost);
      if (cost > 0) {
        totalCost += cost;
      } else if (a.type === 'attraction' || a.type === 'meal') {
        missingCosts++;
      }
    });
  });

  if (missingCosts > 0) {
    warnings.push(
      `${missingCosts} activities missing cost estimates`
    );
  }

  return { passed: true, issues, warnings };
}

/** Check 12: Activity variety */
function checkVariety(itinerary: SimpleItinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  const types = new Set<string>();
  itinerary.days.forEach((day) => {
    (day.activities || []).forEach((a) => types.add(a.type));
  });

  if (types.size < 2) {
    warnings.push('Low variety of activity types — consider diversifying');
  }

  return { passed: true, issues, warnings };
}

/** Check 13: Outdoor activities have rainy day alternatives */
function checkRainyDayAlternatives(itinerary: SimpleItinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  itinerary.days.forEach((day) => {
    (day.activities || []).forEach((a) => {
      if (a.isOutdoor && !a.rainyDayAlternative) {
        warnings.push(
          `Day ${day.dayNumber}: Outdoor activity "${a.name}" has no rainyDayAlternative`
        );
      }
    });
  });

  return { passed: true, issues, warnings };
}

/* ── Format helper ──────────────────────────────────────── */

function formatMins(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* ── Main Entry Points ──────────────────────────────────── */

/**
 * Run the full QA suite on a SimpleItinerary.
 * Returns a combined result with all issues and warnings.
 */
export function validateItinerary(itinerary: SimpleItinerary): QACheckResult {
  const checks = [
    checkEmptyDays,
    checkMeals,
    checkScheduleConflicts,
    checkDurations,
    checkZigzags,
    checkPacedDays,
    checkReasonableHours,
    checkCoordinates,
    checkRequiredFields,
    checkTransitInfo,
    checkCosts,
    checkVariety,
    checkRainyDayAlternatives,
  ];

  const allIssues: string[] = [];
  const allWarnings: string[] = [];

  for (const check of checks) {
    const result = check(itinerary);
    allIssues.push(...result.issues);
    allWarnings.push(...result.warnings);
  }

  return {
    passed: allIssues.length === 0,
    issues: allIssues,
    warnings: allWarnings,
  };
}

/**
 * Run full QA with categorized details.
 */
export function runFullQA(itinerary: SimpleItinerary): {
  passed: boolean;
  summary: QACheckResult;
  details: Record<string, string[]>;
} {
  const details: Record<string, string[]> = {};

  const namedChecks: Array<{ name: string; fn: (it: SimpleItinerary) => QACheckResult }> = [
    { name: 'Empty Days', fn: checkEmptyDays },
    { name: 'Meals', fn: checkMeals },
    { name: 'Schedule Conflicts', fn: checkScheduleConflicts },
    { name: 'Durations', fn: checkDurations },
    { name: 'Zigzag Detection', fn: checkZigzags },
    { name: 'Day Pacing', fn: checkPacedDays },
    { name: 'Reasonable Hours', fn: checkReasonableHours },
    { name: 'Coordinates', fn: checkCoordinates },
    { name: 'Required Fields', fn: checkRequiredFields },
    { name: 'Transit Info', fn: checkTransitInfo },
    { name: 'Cost Tracking', fn: checkCosts },
    { name: 'Activity Variety', fn: checkVariety },
    { name: 'Rainy Day Alternatives', fn: checkRainyDayAlternatives },
  ];

  const allIssues: string[] = [];
  const allWarnings: string[] = [];

  for (const { name, fn } of namedChecks) {
    const result = fn(itinerary);
    const combined = [...result.issues, ...result.warnings];
    if (combined.length > 0) {
      details[name] = combined;
    }
    allIssues.push(...result.issues);
    allWarnings.push(...result.warnings);
  }

  return {
    passed: allIssues.length === 0,
    summary: {
      passed: allIssues.length === 0,
      issues: allIssues,
      warnings: allWarnings,
    },
    details,
  };
}
