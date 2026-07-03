import type { Itinerary, Activity, QACheckResult, DailyItinerary } from '@/types/index';

/**
 * Comprehensive QA check for generated itineraries
 */
export function validateItinerary(itinerary: Itinerary): QACheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check 1: All days have activities
  itinerary.days.forEach((day: DailyItinerary, idx: number) => {
    if (!day.activities || day.activities.length === 0) {
      issues.push(`Day ${idx + 1} (${day.date}) has no activities scheduled`);
    }
  });

  // Check 2: Meals are scheduled appropriately
  itinerary.days.forEach((day: DailyItinerary, idx: number) => {
    const mealTimes = day.meals
      ? Object.entries(day.meals).filter(([_, meal]: [string, any]) => meal)
      : [];

    if (mealTimes.length < 2) {
      warnings.push(
        `Day ${idx + 1} has fewer than 2 meals - consider adding breakfast/lunch/dinner`
      );
    }
  });

  // Check 3: No logical conflicts (activities at same time)
  itinerary.days.forEach((day: DailyItinerary, dayIdx: number) => {
    const sortedActivities = [...(day.activities || [])]
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const current = sortedActivities[i];
      const next = sortedActivities[i + 1];

      const currentEndTime = calculateEndTime(current.startTime, current.duration || 0);
      if (currentEndTime > next.startTime) {
        issues.push(
          `Day ${dayIdx + 1}: "${current.title}" ends after "${next.title}" starts`
        );
      }
    }
  });

  // Check 4: Realistic activity durations
  itinerary.days.forEach((day, dayIdx) => {
    day.activities?.forEach((activity) => {
      if (activity.duration && activity.duration < 15) {
        warnings.push(
          `Day ${dayIdx + 1}: "${activity.title}" is very short (${activity.duration}min)`
        );
      }

      if (activity.duration && activity.duration > 480) {
        warnings.push(
          `Day ${dayIdx + 1}: "${activity.title}" is very long (${activity.duration}min)`
        );
      }
    });
  });

  // Check 5: No zigzagging (same location visited twice in one day)
  itinerary.days.forEach((day, dayIdx) => {
    const locations: Record<string, number[]> = {};

    day.activities?.forEach((activity, actIdx) => {
      const loc = activity.location?.name || 'unknown';
      if (!locations[loc]) {
        locations[loc] = [];
      }
      locations[loc].push(actIdx);
    });

    Object.entries(locations).forEach(([loc, indices]) => {
      if (indices.length > 1 && !isConsecutive(indices)) {
        warnings.push(
          `Day ${dayIdx + 1}: Multiple visits to "${loc}" with other activities in between (potential zigzagging)`
        );
      }
    });
  });

  // Check 6: Sufficient breaks/rest time
  itinerary.days.forEach((day, dayIdx) => {
    const activities = day.activities || [];
    const workMinutes = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const hoursInDay = 16; // 8am-12am
    const minutesInDay = hoursInDay * 60;
    const restMinutes = minutesInDay - workMinutes;

    if (restMinutes < 120) {
      warnings.push(
        `Day ${dayIdx + 1}: Very little rest time (only ${restMinutes}min). Consider reducing activities`
      );
    }
  });

  // Check 7: Cost tracking
  let totalCost = 0;
  let missingCosts = 0;

  itinerary.days.forEach((day) => {
    day.activities?.forEach((activity) => {
      if (activity.estimatedCost) {
        totalCost += activity.estimatedCost;
      } else if (activity.type === 'dining' || activity.type === 'sightseeing') {
        missingCosts++;
      }
    });
  });

  if (missingCosts > 0) {
    warnings.push(
      `${missingCosts} activities missing cost estimates - recommend adding for budget tracking`
    );
  }

  if (totalCost === 0) {
    warnings.push('No costs estimated in itinerary - add cost data for better planning');
  }

  // Check 8: Variety of activities
  const activityTypes = new Set<string>();
  itinerary.days.forEach((day) => {
    day.activities?.forEach((activity) => {
      activityTypes.add(activity.type);
    });
  });

  if (activityTypes.size < 2) {
    warnings.push('Low variety of activity types - consider diversifying');
  }

  // Check 9: Reasonable daily schedules
  itinerary.days.forEach((day, dayIdx) => {
    const activities = day.activities || [];
    if (activities.length > 8) {
      warnings.push(
        `Day ${dayIdx + 1}: Very packed day with ${activities.length} activities`
      );
    }
  });

  // Check 10: Verify activity times are within reasonable hours
  itinerary.days.forEach((day, dayIdx) => {
    day.activities?.forEach((activity) => {
      const [hours, minutes] = activity.startTime.split(':').map(Number);

      if (hours < 6) {
        warnings.push(
          `Day ${dayIdx + 1}: "${activity.title}" starts very early (${activity.startTime})`
        );
      }

      if (hours > 22) {
        warnings.push(
          `Day ${dayIdx + 1}: "${activity.title}" starts very late (${activity.startTime})`
        );
      }
    });
  });

  return {
    passed: issues.length === 0,
    issues,
    warnings,
  };
}

/**
 * Check for zigzag patterns in travel
 */
export function checkForZigzags(activities: Activity[]): string[] {
  const warnings: string[] = [];
  const locations: Map<string, number[]> = new Map();

  activities.forEach((activity, idx) => {
    const loc = activity.location?.name || 'unknown';
    if (!locations.has(loc)) {
      locations.set(loc, []);
    }
    locations.get(loc)!.push(idx);
  });

  locations.forEach((indices, location) => {
    if (indices.length > 1 && !isConsecutive(indices)) {
      const gaps = indices.slice(0, -1).map((idx, i) => indices[i + 1] - idx - 1);
      warnings.push(
        `Zigzagging detected: Return to "${location}" with ${Math.max(...gaps)} activities in between`
      );
    }
  });

  return warnings;
}

/**
 * Check for missing or inadequate meals
 */
export function checkMeals(activities: Activity[], mealData: Record<string, string>): string[] {
  const issues: string[] = [];

  const mealsProvided = Object.values(mealData).filter((m) => m).length;
  if (mealsProvided === 0) {
    issues.push('No meals scheduled');
  } else if (mealsProvided === 1) {
    issues.push('Only one meal scheduled - travelers need at least breakfast and dinner');
  }

  return issues;
}

/**
 * Check for conflicts in activity scheduling
 */
export function checkScheduleConflicts(activities: Activity[]): string[] {
  const issues: string[] = [];
  const sorted = [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const currentEndTime = calculateEndTime(current.startTime, current.duration || 0);
    const nextStartTime = next.startTime;

    if (currentEndTime > nextStartTime) {
      issues.push(
        `Conflict: "${current.title}" (ends ${currentEndTime}) overlaps with "${next.title}" (starts ${nextStartTime})`
      );
    }
  }

  return issues;
}

/**
 * Check for unrealistic travel times between activities
 */
export function checkTravelFeasibility(
  activities: Activity[],
  avgTravelTimeMinutes: number = 30
): string[] {
  const warnings: string[] = [];
  const sorted = [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const currentEnd = calculateEndTime(current.startTime, current.duration || 0);
    const nextStart = next.startTime;

    const [currentEndHours, currentEndMins] = currentEnd.split(':').map(Number);
    const [nextStartHours, nextStartMins] = nextStart.split(':').map(Number);

    const breakMinutes =
      (nextStartHours * 60 + nextStartMins) - (currentEndHours * 60 + currentEndMins);

    const currentLoc = current.location?.name || '';
    const nextLoc = next.location?.name || '';

    if (breakMinutes < avgTravelTimeMinutes && currentLoc !== nextLoc) {
      warnings.push(
        `Only ${breakMinutes}min between "${current.title}" and "${next.title}" - may not be enough travel time`
      );
    }
  }

  return warnings;
}

/**
 * Helper: Check if array indices are consecutive
 */
function isConsecutive(indices: number[]): boolean {
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) {
      return false;
    }
  }
  return true;
}

/**
 * Helper: Calculate activity end time
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Run comprehensive QA suite
 */
export function runFullQA(itinerary: Itinerary): {
  passed: boolean;
  summary: QACheckResult;
  details: Record<string, string[]>;
} {
  const details: Record<string, string[]> = {};
  const allIssues: string[] = [];
  const allWarnings: string[] = [];

  // Run itinerary validation
  const itineraryCheck = validateItinerary(itinerary);
  if (itineraryCheck.issues.length > 0) {
    details['Itinerary Structure'] = itineraryCheck.issues;
    allIssues.push(...itineraryCheck.issues);
  }
  if (itineraryCheck.warnings.length > 0) {
    allWarnings.push(...itineraryCheck.warnings);
  }

  // Check each day
  itinerary.days.forEach((day, dayIdx) => {
    const dayKey = `Day ${dayIdx + 1}`;

    const scheduleConflicts = checkScheduleConflicts(day.activities || []);
    if (scheduleConflicts.length > 0) {
      details[`${dayKey} - Scheduling`] = scheduleConflicts;
      allIssues.push(...scheduleConflicts);
    }

    const travelIssues = checkTravelFeasibility(day.activities || []);
    if (travelIssues.length > 0) {
      details[`${dayKey} - Travel`] = travelIssues;
      allWarnings.push(...travelIssues);
    }

    const mealIssues = checkMeals(day.activities || [], day.meals || {});
    if (mealIssues.length > 0) {
      details[`${dayKey} - Meals`] = mealIssues;
      allIssues.push(...mealIssues);
    }

    const zigzags = checkForZigzags(day.activities || []);
    if (zigzags.length > 0) {
      details[`${dayKey} - Route Optimization`] = zigzags;
      allWarnings.push(...zigzags);
    }
  });

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
