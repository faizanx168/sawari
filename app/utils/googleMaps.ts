import { Loader } from '@googlemaps/js-api-loader';

// Create a singleton instance of the loader
let loader: Loader | null = null;
let googleLoaded = false;
let loadPromise: Promise<typeof google> | null = null;

export const getGoogleMapsLoader = () => {
  if (!loader) {
    loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['places', 'marker'],
      mapIds: [process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID || ''],
    });
  }
  return loader;
};

export const loadGoogleMaps = async () => {
  if (googleLoaded) {
    return Promise.resolve();
  }

  if (loadPromise) {
    await loadPromise;
    return Promise.resolve();
  }

  try {
    const loader = getGoogleMapsLoader();
    loadPromise = loader.load();
    await loadPromise;
    googleLoaded = true;
    return Promise.resolve();
  } catch (error) {
    console.error('Error loading Google Maps:', error);
    loadPromise = null;
    return Promise.reject(error);
  }
};

// Remove the manual script loading approach since we're using the Loader API
export const loadGoogleMapsScript = loadGoogleMaps; 