import dynamic from 'next/dynamic';
import type { Trip } from '@/types';

const TripMapDynamic = dynamic(
  () => import('./trip-map').then((mod) => mod.TripMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface-container)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto"></div>
          <p className="text-[var(--color-on-surface-variant)] mt-4">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface MapWrapperProps {
  trip: any;
}

const MapWrapper: React.FC<MapWrapperProps> = ({ trip }) => {
  return <TripMapDynamic trip={trip} />;
};

export { MapWrapper };
