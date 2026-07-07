import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';

type OTAStatus = 'checking' | 'downloading' | 'ready' | 'up_to_date' | 'error';

export default function OTACheckScreen({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<OTAStatus>('checking');
  const [message, setMessage] = useState('Checking for updates...');
  const doneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Check for update
        const checkResult = await Updates.checkForUpdateAsync();

        if (cancelled) return;

        if (!checkResult.isAvailable) {
          setStatus('up_to_date');
          setMessage('App is up to date');
          // Short delay so user sees the message
          await new Promise(r => setTimeout(r, 500));
          if (!cancelled) onDone();
          return;
        }

        // Download the update
        setStatus('downloading');
        setMessage('Applying update...');
        const fetchResult = await Updates.fetchUpdateAsync();

        if (cancelled) return;

        if (fetchResult.isNew) {
          setStatus('ready');
          setMessage('Update ready! Restarting...');
          await new Promise(r => setTimeout(r, 1000));
          if (!cancelled) {
            await Updates.reloadAsync();
          }
        } else {
          // No new update after all
          if (!cancelled) onDone();
        }
      } catch (err) {
        if (cancelled) return;
        // Silently fail and continue — don't block the user
        onDone();
      }
    };

    run();

    return () => { cancelled = true; };
  }, [onDone]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ai-wardrobe</Text>
      <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  spinner: {
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
