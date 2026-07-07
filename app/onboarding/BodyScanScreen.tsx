import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import { useNavigation } from '@react-navigation/native';

export default function BodyScanScreen() {
  const [isUploading, setIsUploading] = useState(false);
  const { session } = useAuth();
  const navigation = useNavigation();

  const handleStartScan = () => {
    // For MVP, skip camera recording and go directly to progress
    // Camera recording will be implemented in a future phase
    navigation.navigate('ScanProgress' as never);
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
});
