import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import { useNavigation } from '@react-navigation/native';

export default function BodyScanScreen() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const navigation = useNavigation();

  const handleStartScan = () => {
    try {
      // For MVP, skip camera recording and go directly to progress
      // Camera recording will be implemented in a future phase
      navigation.navigate('ScanProgress' as never);
    } catch (error) {
      console.error('Navigation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to navigate to scan progress';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Body Scan Setup</Text>
      
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Instructions</Text>
        <Text style={styles.instructions}>
          For an accurate body scan, please:
        </Text>
        <Text style={styles.bullet}>• Wear form-fitting clothing (leggings, tank top, or swimsuit)</Text>
        <Text style={styles.bullet}>• Stand in good lighting</Text>
        <Text style={styles.bullet}>• Slowly turn 360° in front of the camera</Text>
        <Text style={styles.bullet}>• Keep your arms slightly away from your body</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => setError(null)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {isUploading ? (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.uploadingText}>Processing your scan...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleStartScan}>
          <Text style={styles.buttonText}>Start Body Scan</Text>
        </TouchableOpacity>
      )}
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
  instructionsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  bullet: {
    fontSize: 15,
    color: '#555',
    marginBottom: 8,
    paddingLeft: 10,
  },
  uploadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  uploadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#c62828',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#c62828',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
