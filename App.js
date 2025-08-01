import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, ActivityIndicator, AppState, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Ionicons } from '@expo/vector-icons';
import './utils/BGLocationTask';

import { sendLocation } from './utils/sendLocation';


const LOCATION_TASK_NAME = 'background-location-task';

export default function App() {
  const [status, setStatus] = useState('Requesting location...');
  const [showRetry, setShowRetry] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [dummy, setDummy] = useState(0);

  const getTimeDifference = (lastTime) => {
    const diffMs = Date.now() - new Date(lastTime).getTime();
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);

    if (mins > 0) return `${mins} minute(s)`;
    return `${secs} second(s)`;
  };

  // UI refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      setDummy((prev) => prev + 1); // 🔁 Force UI refresh
    }, 10000); // every 10s

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let intervalId;

    (async () => {
      // Request permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

      if (foregroundStatus !== 'granted' || backgroundStatus !== 'granted') {
        console.warn('Permission not granted for location tracking.');
        return;
      }

      // Start foreground location tracking every 10 seconds
      intervalId = setInterval(async () => {
        try {
          const location = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = location.coords;
          console.log('📍 Foreground location:', latitude, longitude);
          await sendLocation(latitude, longitude);
          setLastUpdated(new Date()); // ⏱️ Update the timestamp state
        } catch (err) {
          console.warn('Failed to get foreground location:', err);
        }
      }, 10000); // 10 seconds

      // Start background updates if not already started
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (!hasStarted) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // every 10 seconds
          distanceInterval: 1, // or every 50 meters moved
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Admin GPS Tracker',
            notificationBody: 'Tracking location in background.',
          },
        });
      }

      // Send location once on app launch
      try {
        const location = await Location.getCurrentPositionAsync({});
        await sendLocation(location.coords.latitude, location.coords.longitude);
        setLastUpdated(new Date()); // ⏱️ Update the timestamp state
        setStatus('✅ Live tracking started');
        setIsLoading(false);
      } catch (err) {
        console.warn('Failed to send initial location:', err);
        setStatus('❌ Failed to start tracking');
        setIsLoading(false);
      }
    })();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") startLocationUpdates();
    });

    // Cleanup when component unmounts
    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  const startLocationUpdates = async () => {
    setShowRetry(false);
    setIsLoading(true);
    setStatus('Requesting location permission...');

    try {
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== 'granted') {
        setStatus('❌ Location permission denied');
        Alert.alert('Permission Denied', 'Please allow location access in settings.');
        setIsLoading(false);
        return;
      }

      const isServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isServicesEnabled) {
        setStatus('❌ Location services disabled');
        Alert.alert('GPS Disabled', 'Please enable GPS/location services.');
        setIsLoading(false);
        return;
      }

      setStatus('🟢 Starting live location tracking...');

      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (!hasStarted) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 10000, // every 10 seconds
          distanceInterval: 0, // regardless of distance moved
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Admin GPS Tracker',
            notificationBody: 'Live location sharing is active.',
            notificationColor: '#3498db',
          },
        });
      }

      setStatus('✅ Live tracking started');
    } catch (err) {
      console.error(err);
      setStatus('🚨 Error starting tracking');
      setShowRetry(true);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    if (status.includes('✅')) return '#2ecc71';
    if (status.includes('❌') || status.includes('🚨')) return '#e74c3c';
    if (status.includes('⚠️')) return '#f39c12';
    return '#3498db';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Admin GPS Tracker</Text>
        <View style={styles.logoContainer}>
          <Ionicons name="location" size={36} color="#3498db" />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.statusContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#3498db" style={styles.spinner} />
          ) : (
            <View style={[styles.statusIcon, { backgroundColor: getStatusColor() }]}>
              {status.includes('✅') && <Ionicons name="checkmark" size={32} color="white" />}
              {(status.includes('❌') || status.includes('⚠️')) && <Ionicons name="alert" size={32} color="white" />}
              {status.includes('🚨') && <Ionicons name="warning" size={32} color="white" />}
            </View>
          )}
          <Text style={[styles.status, { color: getStatusColor() }]}>{status}</Text>
        </View>

        {showRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={startLocationUpdates}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>🟡 Last seen: {getTimeDifference(lastUpdated)} ago</Text>
          <Text style={styles.footerText}>Tracking active: {new Date().toLocaleTimeString()}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.developerButton}
        onPress={() => Linking.openURL('https://www.linkedin.com/in/kalyanpannangala')}
      >
        <Text style={styles.developerText}>Developed by <Text style={styles.developerName}>Kalyan Pannangala</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

// 🧠 Background task to send location
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Task Error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const { latitude, longitude } = locations[0].coords;
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
      console.log('✅ Location sent:', latitude, longitude);
      // Note: setLastUpdated can't be called from background task
      // The timestamp will be updated when foreground tracking runs
    } catch (err) {
      console.error('🚨 Failed to send location', err);
    }
  }
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f9fc', padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  headerText: { fontSize: 28, fontWeight: '700', color: '#2c3e50' },
  logoContainer: { backgroundColor: '#e3f2fd', borderRadius: 50, padding: 12 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1, shadowRadius: 15, elevation: 5,
  },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  spinner: { marginRight: 15 },
  statusIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  status: { fontSize: 18, flex: 1, fontWeight: '500' },
  retryButton: { backgroundColor: '#3498db', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  footer: { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 25, paddingTop: 15 },
  footerText: { color: '#7f8c8d', fontSize: 14, textAlign: 'center' },
  developerButton: { marginTop: 30, alignItems: 'center' },
  developerText: { color: '#95a5a6', fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
  developerName: { color: '#3498db', fontWeight: '600' },
});
