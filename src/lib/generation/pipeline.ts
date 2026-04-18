import { callClaude, callClaudeJSON } from '../claude';
import { searchPlaces } from '../google-places';
import { getDailyForecast, determineWeatherTier, isWeatherSuitableForActivity } from '../weather';
import { getTransitTime, getMultiLocationRoute } from '../transit';
import { getDestinationSources, getTrustedDestinationSources } from '../source-resolver';
import { supabaseServer as supabase } from '../supabase';
import { runFullQA } from './qa-simulator';
import * as prompts from './prompts';
import type { Trip, Itinerary, DailyItinerary, Activity, Day, WeatherData } from '@/types/index';
import { v4 as uuidv4 } from 'uuid';

type PipelineStep =
  | 'analyzing_destination'
  | 'generating_daily_activities'
  | 'finding_restaurants'
  | 'booking_accommodations'
  | 'planning_transit'
  | 'finalizing_itinerary'
  | 'qa_review';

interface PipelineProgress {
  step: PipelineStep;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

/**
 * Main trip generation pipeline orchestrator
 * Runs through 7 steps to generate a complete itinerary
 */
export class GenerationPipeline {
  private trip: Trip;
  private jobId: string;
  private progress: Map<PipelineStep, PipelineProgress> = new Map();
  private itinerary: Partial<Itinerary> & { highlights?: string[]; destinationAnalysis?: string; hotelRecommendations?: string; qaIssues?: string[]; qaRecommendations?: string; qaResult?: any } = { days: [] };

  constructor(trip: Trip) {
    this.trip = trip;
    this.jobId = uuidv4();
    this.initializeProgress();
  }

  private initializeProgress(): void {
    const steps: PipelineStep[] = [
      'analyzing_destination',
      'generating_daily_activities',
      'finding_restaurants',
      'booking_accommodations',
      'planning_transit',
      'finalizing_itinerary',
      'qa_review',
    ];

    steps.forEach((step, idx) => {
      this.progress.set(step, {
        step,
        status: 'pending',
        progress: (idx / steps.length) * 100,
      });
    });
  }

  /**
   * Run the entire pipeline
   */
  async run(): Promise<Itinerary> {
    try {
      await this.createGenerationJob('pending');

      // Step 1: Analyze destination
      await this.step1_AnalyzeDestination();

      // Step 2: Generate daily activities
      await this.step2_GenerateDailyActivities();

      // Step 3: Find restaurants
      await this.step3_FindRestaurants();

      // Step 4: Book accommodations
      await this.step4_BookAccommodations();

      // Step 5: Plan transit
      await this.step5_PlanTransit();

      // Step 6: Finalize itinerary
      await this.step6_FinalizeItinerary();

      // Step 7: QA review
      await this.step7_QAReview();

      // Update job status
      await this.updateGenerationJob('completed');

      return this.itinerary as Itinerary;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.updateGenerationJob('failed', errorMsg);
      throw error;
    }
  }

  /**
   * Step 1: Analyze destination and get weather, sources, key insights
   */
  private async step1_AnalyzeDestination(): Promise<void> {
    await this.setStepProgress('analyzing_destination', 'running');

    try {
      // Get weather forecast
      const weatherData = await getDailyForecast(
        this.trip.destinationCoordinates?.lat || 48.8566,
        this.trip.destinationCoordinates?.lng || 2.3522,
        this.trip.startDate,
        this.trip.endDate
      );

      (this.trip as any).weatherData = weatherData;
      (this.trip as any).weatherTier = determineWeatherTier(weatherData);

      // Get destination sources
      const sources = await getDestinationSources(
        this.trip.destination.toLowerCase().replace(/\s+/g, '-'),
        'general'
      );

      // Generate destination analysis
      const analysis = await callClaude(
        prompts.generateDestinationAnalysisPrompt(this.trip, weatherData, sources)
      );

      console.log('Destination analysis:', analysis);

      // Extract key highlights (simple parsing)
      const highlights = analysis
        .split('\n')
        .filter((line) => line.startsWith('- ') || line.startsWith('* '))
        .slice(0, 5)
        .map((line) => line.replace(/^[-*]\s+/, ''));

      // Store for next steps
      (this.itinerary as any).highlights = highlights;
      (this.itinerary as any).destinationAnalysis = analysis;

      await this.setStepProgress('analyzing_destination', 'completed');
    } catch (error) {
      await this.setStepProgress('analyzing_destination', 'failed', String(error));
      throw error;
    }
  }

  /**
   * Step 2: Generate daily activities
   */
  private async step2_GenerateDailyActivities(): Promise<void> {
    await this.setStepProgress('generating_daily_activities', 'running');

    try {
      const days: DailyItinerary[] = [];
      const startDate = new Date(this.trip.startDate);
      const endDate = new Date(this.trip.endDate);
      const numDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const highlights = (this.itinerary as any).highlights || [];

      for (let dayNum = 1; dayNum <= numDays; dayNum++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + dayNum - 1);
        const dateStr = currentDate.toISOString().split('T')[0];

        const weather: WeatherData = ((this.trip as any).weatherData as WeatherData[] | undefined)?.find((w) => w.date === dateStr) || {
          date: dateStr,
          highTemp: 20,
          lowTemp: 15,
          condition: 'Partly cloudy',
          precipitation: 0,
          icon: 'cloud',
        };

        const prompt = prompts.generateDailyActivitiesPrompt(
          this.trip,
          dayNum,
          dateStr,
          weather,
          highlights
        );

        const response = await callClaudeJSON<{
          theme: string;
          activities: Array<{
            title: string;
            time: string;
            duration: number;
            description: string;
            cost?: number;
          }>;
        }>(prompt);

        const activities: Activity[] = response.activities.map((a, idx) => ({
          id: uuidv4(),
          dayId: uuidv4(),
          title: a.title,
          description: a.description,
          type: this.categorizeActivity(a.title),
          startTime: a.time,
          duration: a.duration,
          estimatedCost: a.cost,
          notes: '',
          order: idx,
          location: { name: this.trip.destination },
        }));

        const day: DailyItinerary = {
          day: dayNum,
          date: dateStr,
          theme: response.theme,
          activities,
          weatherExpected: {
            temp: weather.highTemp,
            condition: weather.condition,
            precipitation: weather.precipitation,
          },
          meals: {
            breakfast: '',
            lunch: '',
            dinner: '',
          },
        };

        days.push(day);

        console.log(`Generated activities for day ${dayNum}`);
      }

      this.itinerary.days = days;
      await this.setStepProgress('generating_daily_activities', 'completed');
    } catch (error) {
      await this.setStepProgress('generating_daily_activities', 'failed', String(error));
      throw error;
    }
  }

  /**
   * Step 3: Find restaurants for meals
   */
  private async step3_FindRestaurants(): Promise<void> {
    await this.setStepProgress('finding_restaurants', 'running');

    try {
      for (const day of this.itinerary.days || []) {
        const breakfastPrompt = prompts.generateRestaurantRecommendationsPrompt(
          this.trip.destination,
          day.day,
          'breakfast',
          this.trip.preferences,
          this.trip.preferences.budget || 'moderate'
        );

        const breakfastRecs = await callClaude(breakfastPrompt);

        const lunchPrompt = prompts.generateRestaurantRecommendationsPrompt(
          this.trip.destination,
          day.day,
          'lunch',
          this.trip.preferences,
          this.trip.preferences.budget || 'moderate'
        );

        const lunchRecs = await callClaude(lunchPrompt);

        const dinnerPrompt = prompts.generateRestaurantRecommendationsPrompt(
          this.trip.destination,
          day.day,
          'dinner',
          this.trip.preferences,
          this.trip.preferences.budget || 'moderate'
        );

        const dinnerRecs = await callClaude(dinnerPrompt);

        // Store first restaurant recommendation from each meal
        (day.meals as Record<string, string>) = {
          breakfast: this.extractFirstRestaurant(breakfastRecs),
          lunch: this.extractFirstRestaurant(lunchRecs),
          dinner: this.extractFirstRestaurant(dinnerRecs),
        };

        console.log(`Found restaurants for day ${day.day}`);
      }

      await this.setStepProgress('finding_restaurants', 'completed');
    } catch (error) {
      await this.setStepProgress('finding_restaurants', 'failed', String(error));
      throw error;
    }
  }

  /**
   * Step 4: Book accommodations
   */
  private async step4_BookAccommodations(): Promise<void> {
    await this.setStepProgress('booking_accommodations', 'running');

    try {
      const hotelPrompt = prompts.generateAccommodationPrompt(
        this.trip.destination,
        this.trip.startDate,
        this.trip.endDate,
        this.trip.travelers,
        this.trip.preferences.hotelPreference || 'comfort',
        this.trip.preferences.budget || 'moderate'
      );

      const hotelRecs = await callClaude(hotelPrompt);

      // Store hotel recommendation
      (this.itinerary as any).hotelRecommendations = hotelRecs;

      await this.setStepProgress('booking_accommodations', 'completed');
    } catch (error) {
      await this.setStepProgress('booking_accommodations', 'failed', String(error));
      throw error;
    }
  }

  /**
   * Step 5: Plan transit between activities
   */
  private async step5_PlanTransit(): Promise<void> {
    await this.setStepProgress('planning_transit', 'running');

    try {
      for (const day of this.itinerary.days || []) {
        const activities = day.activities || [];

        // Get transit info between activities
        for (let i = 0; i < activities.length - 1; i++) {
          const from = activities[i];
          const to = activities[i + 1];

          // For now, use generic estimate (would need place coordinates for actual routing)
          const transitTime = await getTransitTime(
            this.trip.destinationCoordinates?.lat || 48.8566,
            this.trip.destinationCoordinates?.lng || 2.3522,
            this.trip.destinationCoordinates?.lat || 48.8566,
            this.trip.destinationCoordinates?.lng || 2.3522,
            'walking'
          );

          // Add transit info to activity notes
          if (from.notes) {
            from.notes += `\n\nTransit to next: ~${transitTime.durationMinutes} min`;
          } else {
            from.notes = `Transit to next: ~${transitTime.durationMinutes} min`;
          }
        }
      }

      await this.setStepProgress('planning_transit', 'completed');
    } catch (error) {
      // Don't fail on transit issues
      console.warn('Transit planning issue:', error);
      await this.setStepProgress('planning_transit', 'completed');
    }
  }

  /**
   * Step 6: Finalize and enhance itinerary
   */
  private async step6_FinalizeItinerary(): Promise<void> {
    await this.setStepProgress('finalizing_itinerary', 'running');

    try {
      // Calculate total cost
      let totalCost = 0;
      for (const day of this.itinerary.days || []) {
        for (const activity of day.activities || []) {
          totalCost += activity.estimatedCost || 0;
        }
      }

      this.itinerary.totalCost = totalCost;
      this.itinerary.tripId = this.trip.id;

      // Extract logistics
      const logistics: string[] = [
        `Total estimated cost: €${totalCost}`,
        `Weather tier: ${(this.trip as any).weatherTier}`,
        `Duration: ${this.itinerary.days?.length} days`,
        `Travelers: ${this.trip.travelers}`,
      ];

      this.itinerary.logistics = logistics;

      await this.setStepProgress('finalizing_itinerary', 'completed');
    } catch (error) {
      await this.setStepProgress('finalizing_itinerary', 'failed', String(error));
      throw error;
    }
  }

  /**
   * Step 7: QA review
   */
  private async step7_QAReview(): Promise<void> {
    await this.setStepProgress('qa_review', 'running');

    try {
      const qaResult = runFullQA(this.itinerary as any);

      if (!qaResult.passed) {
        console.warn('QA issues found:', qaResult.summary.issues);

        // Try to fix with Claude
        const itineraryStr = JSON.stringify(this.itinerary, null, 2);
        const qaPrompt = prompts.generateQAReviewPrompt(itineraryStr, {
          days: this.itinerary.days?.length || 0,
          travelers: this.trip.travelers,
          budget: this.trip.preferences.budget || 'moderate',
          interests: this.trip.preferences.interests || [],
        });

        const qaResponse = await callClaude(qaPrompt);
        console.log('QA recommendations:', qaResponse);

        (this.itinerary as any).qaIssues = qaResult.summary.issues;
        (this.itinerary as any).qaRecommendations = qaResponse;
      }

      (this.itinerary as any).qaResult = qaResult;

      await this.setStepProgress('qa_review', 'completed');
    } catch (error) {
      console.warn('QA review error:', error);
      // Don't fail pipeline on QA issues
      await this.setStepProgress('qa_review', 'completed');
    }
  }

  /**
   * Helper: Categorize activity by title
   */
  private categorizeActivity(title: string): 'sightseeing' | 'dining' | 'activity' | 'nightlife' | 'shopping' | 'wellness' | 'sports' {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('restaurant') || titleLower.includes('dinner') || titleLower.includes('lunch') || titleLower.includes('breakfast')) {
      return 'dining';
    }
    if (titleLower.includes('museum') || titleLower.includes('monument') || titleLower.includes('tour')) {
      return 'sightseeing';
    }
    if (titleLower.includes('night') || titleLower.includes('bar') || titleLower.includes('club')) {
      return 'nightlife';
    }
    if (titleLower.includes('shop') || titleLower.includes('market')) {
      return 'shopping';
    }
    if (titleLower.includes('yoga') || titleLower.includes('spa') || titleLower.includes('wellness')) {
      return 'wellness';
    }
    if (titleLower.includes('sports') || titleLower.includes('hike') || titleLower.includes('bike')) {
      return 'sports';
    }

    return 'activity';
  }

  /**
   * Helper: Extract first restaurant recommendation
   */
  private extractFirstRestaurant(recommendations: string): string {
    // Simple extraction - just take first line that looks like a restaurant name
    const lines = recommendations.split('\n');
    for (const line of lines) {
      if (line.trim() && !line.startsWith('-') && line.length > 5) {
        return line.trim();
      }
    }
    return 'Local Restaurant';
  }

  /**
   * Database helpers
   */
  private async createGenerationJob(status: string): Promise<void> {
    try {
      await (supabase as any).from('generation_jobs').insert({
        id: this.jobId,
        trip_id: this.trip.id,
        step: 'analyzing_destination',
        status,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Failed to create generation job:', error);
    }
  }

  private async updateGenerationJob(status: string, error?: string): Promise<void> {
    try {
      await (supabase as any)
        .from('generation_jobs')
        .update({
          status,
          error,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.jobId);
    } catch (error) {
      console.warn('Failed to update generation job:', error);
    }
  }

  private async setStepProgress(
    step: PipelineStep,
    status: 'pending' | 'running' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    const progress = this.progress.get(step);
    if (progress) {
      progress.status = status;
      if (error) {
        progress.error = error;
      }
    }

    // Update database
    try {
      await (supabase as any)
        .from('generation_jobs')
        .update({
          step,
          status,
          error,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.jobId);
    } catch (error) {
      console.warn('Failed to update step progress:', error);
    }
  }
}

/**
 * Run trip generation pipeline
 */
export async function generateTrip(trip: Trip): Promise<Itinerary> {
  const pipeline = new GenerationPipeline(trip);
  return pipeline.run();
}
