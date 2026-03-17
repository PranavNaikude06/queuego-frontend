/**
 * Reverse Geocoding Utility
 * Converts Latitude/Longitude to a human-readable address using OSM Nominatim (free)
 */
export const reverseGeocode = async (lat, lng) => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'Accept-Language': 'en',
                    'User-Agent': 'QueueGo-App' // Required by Nominatim policy
                }
            }
        );

        if (!response.ok) throw new Error('Geocoding service unavailable');

        const data = await response.json();
        return data.display_name || null;
    } catch (error) {
        console.error('Reverse Geocoding Error:', error);
        return null;
    }
};
