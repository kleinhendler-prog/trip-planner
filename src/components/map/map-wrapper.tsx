import dynamic from 'next/dynamic';
import type { Trip } from '@/types';

const TripMapDynamic = dynamic(
  () => import('./trip-map').then((mod) => mod.TripMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading map...</p>
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
