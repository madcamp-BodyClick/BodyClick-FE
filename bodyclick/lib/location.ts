export type GeoPoint = {
  lat: number;
  lng: number;
};

const FALLBACK_LOCATION: GeoPoint = {
  lat: 37.5665,
  lng: 126.978,
};

export const getUserLocation = () =>
  new Promise<GeoPoint>((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      resolve(FALLBACK_LOCATION);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        resolve(FALLBACK_LOCATION);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000,
      },
    );
  });
