import type { WeatherData, ClimateNorms } from '@/types/index';

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    relative_humidity_2m: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
  };
  monthly?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    precipitation_days?: number[];
  };
  timezone: string;
}

// WMO Weather code mappings
const WMO_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with hail',
};

/**
 * Get climate normals for a location (monthly averages)
 */
export async function getClimateNorms(
  lat: number,
  lng: number,
  month: number
): Promise<ClimateNorms> {
  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${new Date().getFullYear()}-${String(month).padStart(2, '0')}-01&end_date=${new Date().getFullYear()}-${String(month).padStart(2, '0')}-28&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.statusText}`);
    }

    const data: OpenMeteoResponse = await response.json();

    if (!data.daily || data.daily.temperature_2m_max.length === 0) {
      throw new Error('No climate data available');
    }

    // Calculate averages
    const tempMaxValues = data.daily.temperature_2m_max;
    const tempMinValues = data.daily.temperature_2m_min;
    const precipValues = data.daily.precipitation_sum;

    const avgTempMax = tempMaxValues.reduce((a, b) => a + b, 0) / tempMaxValues.length;
    const avgTempMin = tempMinValues.reduce((a, b) => a + b, 0) / tempMinValues.length;
    const avgPrecip = precipValues.reduce((a, b) => a + b, 0);
    const rainyDays = precipValues.filter((p) => p > 0.1).length;

    return {
      month,
      tempMin: Math.round(avgTempMin * 10) / 10,
      tempMax: Math.round(avgTempMax * 10) / 10,
      precipitation: Math.round(avgPrecip * 10) / 10,
      rainyDays,
    };
  } catch (error) {
    console.error('Failed to get climate norms:', error);
    // Return generic defaults
    return {
      month,
      tempMin: 15,
      tempMax: 25,
      precipitation: 50,
      rainyDays: 10,
    };
  }
}

/**
 * Get daily forecast for a specific date range
 */
export async function getDailyForecast(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string
): Promise<WeatherData[]> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m&temperature_unit=celsius&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.statusText}`);
    }

    const data: OpenMeteoResponse = await response.json();

    if (!data.daily || data.daily.time.length === 0) {
      throw new Error('No forecast data available');
    }

    // Transform to WeatherData format
    const forecast: WeatherData[] = data.daily.time.map((date, idx) => ({
      date,
      lowTemp: Math.round(data.daily.temperature_2m_min[idx] * 10) / 10,
      highTemp: Math.round(data.daily.temperature_2m_max[idx] * 10) / 10,
      condition: WMO_CODES[data.daily.weather_code[idx]] || 'Unknown',
      icon: String(data.daily.weather_code[idx]),
      precipitation: Math.round(data.daily.precipitation_sum[idx] * 10) / 10,
    }));

    return forecast;
  } catch (error) {
    console.error('Failed to get forecast:', error);
    return [];
  }
}

/**
 * Determine weather tier based on conditions
 */
export function determineWeatherTier(
  weatherData: WeatherData[]
): 'optimal' | 'good' | 'acceptable' | 'challenging' {
  if (weatherData.length === 0) {
    return 'good';
  }

  let rainyDays = 0;
  let coldDays = 0;
  let hotDays = 0;

  for (const day of weatherData) {
    // Check for rain
    if (day.precipitation > 2) {
      rainyDays++;
    }

    // Check for extreme temperatures
    if (day.lowTemp < 0) {
      coldDays++;
    }
    if (day.highTemp > 35) {
      hotDays++;
    }
  }

  const rainyPercent = (rainyDays / weatherData.length) * 100;
  const coldPercent = (coldDays / weatherData.length) * 100;
  const hotPercent = (hotDays / weatherData.length) * 100;

  // Determine tier
  if (rainyPercent > 50 || coldPercent > 30 || hotPercent > 30) {
    return 'challenging';
  }

  if (rainyPercent > 20 || coldPercent > 10 || hotPercent > 10) {
    return 'acceptable';
  }

  if (rainyPercent > 0) {
    return 'good';
  }

  return 'optimal';
}

/**
 * Check if weather is suitable for a specific activity
 */
export function isWeatherSuitableForActivity(
  activity: string,
  weatherData: WeatherData
): { suitable: boolean; message: string } {
  const condition = weatherData.condition.toLowerCase();
  const temp = (weatherData.lowTemp + weatherData.highTemp) / 2;
  const precip = weatherData.precipitation;

  const activityLower = activity.toLowerCase();

  // Outdoor activities
  if (activityLower.includes('hiking') || activityLower.includes('trek')) {
    if (precip > 10) {
      return { suitable: false, message: 'Heavy rain not suitable for hiking' };
    }
    if (temp < -5) {
      return { suitable: false, message: 'Too cold for safe hiking' };
    }
    return { suitable: true, message: 'Good hiking weather' };
  }

  if (activityLower.includes('beach') || activityLower.includes('swim')) {
    if (precip > 5) {
      return { suitable: false, message: 'Rain expected, beach activities not ideal' };
    }
    if (temp < 15) {
      return { suitable: false, message: 'Too cold for beach activities' };
    }
    return { suitable: true, message: 'Great beach weather' };
  }

  if (activityLower.includes('picnic') || activityLower.includes('outdoor')) {
    if (precip > 5) {
      return { suitable: false, message: 'Rain forecast, might want to reschedule' };
    }
    if (temp > 35) {
      return { suitable: false, message: 'Too hot, plan indoor activities instead' };
    }
    return { suitable: true, message: 'Good weather for outdoor activities' };
  }

  // Default: outdoor is okay if no heavy rain
  if (precip > 15) {
    return { suitable: false, message: 'Heavy rain expected' };
  }

  return { suitable: true, message: 'Weather looks reasonable' };
}
