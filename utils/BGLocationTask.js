// backgroundTask.js
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Task Error:', error);
    return;
  }
  if (data?.locations?.length > 0) {
    const { latitude, longitude } = data.locations[0].coords;
    try {
      await fetch('https://iv-2025.vercel.app/api/adminGPS/admin-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, timestamp: new Date().toISOString() }),
      });
      console.log('✅ Location sent:', latitude, longitude);
    } catch (err) {
      console.error('🚨 Failed to send location', err);
    }
  }
});
