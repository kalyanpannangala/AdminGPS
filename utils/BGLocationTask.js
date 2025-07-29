import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import sendLocation from './sendLocation'; // adjust path if needed

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('❌ Location task error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data;
    const { latitude, longitude } = locations[0].coords;
    console.log('📍 Background location:', latitude, longitude);
    await sendLocation(latitude, longitude);
  }
});

export default LOCATION_TASK_NAME;
