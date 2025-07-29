// utils/sendLocation.js

export const sendLocation = async (latitude, longitude) => {
    try {
      await fetch('https://iv-2025.vercel.app/api/adminGPS/admin-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error sending location:', error);
    }
  };
  