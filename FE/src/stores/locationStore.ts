import { create } from 'zustand';

export const FALLBACK_LOCATION = {
  lat: 36.3553,
  lng: 127.2983, // SSAFY 대전 캠퍼스
};

interface LocationState {
  lat: number | null;
  lng: number | null;
  isFallback: boolean;
  setLocation: (lat: number, lng: number, isFallback?: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  lat: null,
  lng: null,
  isFallback: false,
  setLocation: (lat, lng, isFallback = false) => set({ lat, lng, isFallback }),
}));
