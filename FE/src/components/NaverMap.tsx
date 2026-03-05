import { useEffect, useRef, useState } from 'react';

import { loadNaverMapScript } from '@/lib/naverMap';

interface NaverMapProps {
  lat?: number;
  lng?: number;
}

export default function NaverMap({ lat = 37.3595704, lng = 127.105399 }: NaverMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNaverMapScript()
      .then(() => {
        if (mapElement.current) {
          // @ts-ignore
          new window.naver.maps.Map(mapElement.current, {
            center: // @ts-ignore
              new window.naver.maps.LatLng(lat, lng),
            zoom: 15,
          });
        }
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [lat, lng]);

  if (error) {
    return <div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-md">{error}</div>;
  }

  return <div ref={mapElement} className="w-full h-[400px] bg-gray-200 rounded-md shadow-inner" />;
}
