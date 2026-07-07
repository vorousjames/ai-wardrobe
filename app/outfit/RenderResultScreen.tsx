import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Button, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RenderPipeline } from '../../lib/rendering/RenderPipeline';
import { RenderStatus, RenderResult } from '../../lib/rendering/types';

export default function RenderResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { garment_ids, user_id } = route.params as { garment_ids: string | string[], user_id: string };
  
  const [status, setStatus] = useState<RenderStatus>(RenderStatus.PENDING);
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>('Preparing to render...');
  const [result, setResult] = useState<RenderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const renderPipeline = new RenderPipeline();

  useEffect(() => {
    if (!garment_ids || !user_id) {
      setError('Missing required parameters');
      return;
    }
    
    const garmentIds = Array.isArray(garment_ids) ? garment_ids : [garment_ids];
    
    // Start the rendering process
    renderOutfit(garmentIds, user_id);
  }, [garment_ids, user_id]);

  const renderOutfit = async (garmentIds: string[], userId: string) => {
    try {
      const result = await renderPipeline.renderOutfit(
        {
          garment_ids: garmentIds,
          pose: 'front', // Default pose for now
          user_id: userId
        },
        (progress) => {
          setStatus(progress.status);
          if (progress.progress !== undefined) {
            setProgress(progress.progress);
          }
          if (progress.message) {
            setMessage(progress.message);
          }
          if (progress.error) {
            setError(progress.error);
          }
        }
      );
      
      setResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatus(RenderStatus.FAILED);
    }
  };

  const handleSave = () => {
    Alert.alert('Save', 'Image saved successfully!');
    // In a real implementation, this would save the image to the device
  };

  const handleShare = () => {
    Alert.alert('Share', 'Image shared successfully!');
    // In a real implementation, this would share the image
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Render Failed</Text>
        <Text style={styles.error}>{error}</Text>
        <Button title="Try Again" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  if (result) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Render Complete</Text>
        <Image source={{ uri: result.image_url }} style={styles.image} resizeMode="contain" />
        <View style={styles.buttonContainer}>
          <Button title="Save" onPress={handleSave} />
          <Button title="Share" onPress={handleShare} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rendering Outfit</Text>
      
      <View style={styles.progressContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.status}>{message}</Text>
        <Text style={styles.progress}>{progress}%</Text>
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  status: {
    fontSize: 16,
    marginVertical: 10,
    textAlign: 'center',
  },
  progress: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    width: '80%',
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  image: {
    width: 300,
    height: 400,
    marginBottom: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
});