import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import { useNavigation } from '@react-navigation/native';

export default function ScanProgressScreen() {
  const [status, setStatus] = useState<'uploading' | 'processing' | 'complete' | 'failed'>('uploading');
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const { session } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!session?.user) return;

    // Poll for status updates
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('body_scan_status')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile status:', error);
          return;
        }

        switch (data.body_scan_status) {
          case 'uploaded':
            setStatus('processing');
            setProgress(30);
            setEta(120); // 2 minutes estimate
            break;
          case 'processing':
            setStatus('processing');
            setProgress(prev => Math.min((prev || 0) + 5, 90)); // Handle possibly null prev
            if (eta !== null) setEta(prev => Math.max((prev || 0) - 5, 0));
            break;
          case 'complete':
            setStatus('complete');
            setProgress(100);
            break;
          case 'failed':
            setStatus('failed');
            break;
          default:
            // Keep current status
            break;
        }
      } catch (error) {
        console.error('Error polling profile status:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [session, eta]);

  const retryScan = () => {
    navigation.navigate('BodyScan' as never);
  };

  const continueToWardrobe = () => {
    navigation.navigate('MainTabs' as never);
  };

  const renderUploadingState = () => (
    <View style={styles.stateContainer}>
      <ActivityIndicator size="large" color="#007AFF" style={styles.icon} />
      <Text style={styles.stateTitle}>Uploading Your Scan</Text>
      <Text style={styles.stateDescription}>
        We're uploading your body scan to our servers for processing.
      </Text>
    </View>
  );

  const renderProcessingState = () => (
    <View style={styles.stateContainer}>
      <ActivityIndicator size="large" color="#007AFF" style={styles.icon} />
      <Text style={styles.stateTitle}>Processing Your Scan</Text>
      <Text style={styles.stateDescription}>
        We're analyzing your body measurements and creating your personalized avatar.
      </Text>
      {eta !== null && (
        <Text style={styles.etaText}>
          Estimated time remaining: {Math.floor(eta / 60)}:{String(eta % 60).padStart(2, '0')}
        </Text>
      )}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>{progress}% complete</Text>
    </View>
  );

  const renderCompleteState = () => (
    <View style={styles.stateContainer}>
      <Text style={[styles.icon, styles.checkmark]}>✓</Text>
      <Text style={styles.stateTitle}>Scan Complete!</Text>
      <Text style={styles.stateDescription}>
        Your body measurements have been successfully processed. You can now create personalized outfits.
      </Text>
      <TouchableOpacity style={styles.button} onPress={continueToWardrobe}>
        <Text style={styles.buttonText}>Continue to Wardrobe</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFailedState = () => (
    <View style={styles.stateContainer}>
      <Text style={[styles.icon, styles.errorIcon]}>⚠</Text>
      <Text style={styles.stateTitle}>Scan Processing Failed</Text>
      <Text style={styles.stateDescription}>
        We encountered an issue while processing your scan. Please try again.
      </Text>
      <TouchableOpacity style={styles.button} onPress={retryScan}>
        <Text style={styles.buttonText}>Retry Scan</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Progress</Text>
      {status === 'uploading' && renderUploadingState()}
      {status === 'processing' && renderProcessingState()}
      {status === 'complete' && renderCompleteState()}
      {status === 'failed' && renderFailedState()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  stateContainer: {
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    fontSize: 48,
    marginBottom: 20,
  },
  checkmark: {
    color: '#34C759',
  },
  errorIcon: {
    color: '#FF3B30',
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  stateDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  etaText: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 15,
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});