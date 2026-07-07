import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import { useNavigation } from '@react-navigation/native';

type ScanPhase = 'instructions' | 'camera' | 'uploading';

export default function BodyScanScreen() {
  const [phase, setPhase] = useState<ScanPhase>('instructions');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { session } = useAuth();
  const navigation = useNavigation();

  const handleStartScan = async () => {
    try {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert(
            'Camera Required',
            'Body scan needs camera access to capture your 360° photos. Please enable camera permissions in Settings.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
      setPhase('camera');
      setPhotos([]);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start camera';
      setError(msg);
      Alert.alert('Error', msg);
    }
  };

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setPhotos(prev => [...prev, photo.uri]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to take photo';
      Alert.alert('Error', msg);
    }
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadScan = useCallback(async () => {
    if (!session?.user?.id || photos.length === 0) return;
    
    setIsUploading(true);
    setPhase('uploading');
    setError(null);

    try {
      // Upload each photo to Supabase storage
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < photos.length; i++) {
        const photoUri = photos[i];
        const fileName = `body-scan/${session.user.id}/${Date.now()}_${i}.jpg`;
        
        const response = await fetch(photoUri);
        const blob = await response.blob();
        
        const { error: uploadError } = await supabase.storage
          .from('body-scans')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('body-scans')
          .getPublicUrl(fileName);
        
        uploadedUrls.push(publicUrl);
      }

      // Update body_scan_status in profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          body_scan_status: 'uploaded',
          body_scan_photos: uploadedUrls,
          body_scan_updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      navigation.navigate('ScanProgress' as never);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      setPhase('camera');
      setIsUploading(false);
      Alert.alert('Upload Error', msg);
    }
  }, [session, photos, navigation]);

  if (phase === 'camera' && permission?.granted) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView 
          ref={cameraRef}
          style={styles.camera}
          facing="user"
        >
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraHint}>
              Take photos from different angles as you turn
            </Text>
            
            <View style={styles.photoStrip}>
              {photos.map((uri, i) => (
                <TouchableOpacity key={i} onPress={() => removePhoto(i)}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.cameraControls}>
              <TouchableOpacity 
                style={styles.captureButton} 
                onPress={takePhoto}
              >
                <View style={styles.captureInner} />
              </TouchableOpacity>
            </View>

            {photos.length >= 4 && (
              <TouchableOpacity 
                style={styles.doneButton} 
                onPress={uploadScan}
              >
                <Text style={styles.doneButtonText}>
                  Done ({photos.length} photos)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </CameraView>
      </View>
    );
  }

  if (phase === 'uploading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.uploadingText}>Uploading your scan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Body Scan Setup</Text>
      
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Instructions</Text>
        <Text style={styles.instructions}>
          Take 4-8 photos from different angles:
        </Text>
        <Text style={styles.bullet}>• Wear form-fitting clothing</Text>
        <Text style={styles.bullet}>• Stand in good lighting</Text>
        <Text style={styles.bullet}>• Take a photo every ~90° as you turn</Text>
        <Text style={styles.bullet}>• Keep arms slightly away from your body</Text>
        <Text style={styles.bullet}>• Tap a thumbnail to remove and retake</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => setError(null)}
          >
            <Text style={styles.retryButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity style={styles.button} onPress={handleStartScan}>
        <Text style={styles.buttonText}>Start Body Scan</Text>
      </TouchableOpacity>
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
  uploadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
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
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 50,
    alignItems: 'center',
  },
  cameraHint: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  photoStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  cameraControls: {
    alignItems: 'center',
    marginBottom: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  doneButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
