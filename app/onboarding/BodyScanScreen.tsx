import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Video } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import { useNavigation } from '@react-navigation/native';

export default function BodyScanScreen() {
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const cameraRef = useRef<any>(null); // Using any type for camera ref due to type issues
  const { session } = useAuth();
  const navigation = useNavigation();

  if (!permission) {
    // Camera permissions are still loading
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Camera Access Required</Text>
        <Text style={styles.instructions}>
          We need camera access to record your body scan. Please allow camera permissions.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        const videoRecordPromise = cameraRef.current.recordAsync({
          maxDuration: 15,
          // Removed quality property that doesn't exist in the type
        });
        
        const data = await videoRecordPromise;
        if (data && data.uri) {
          setRecordedVideo(data.uri);
        }
        setIsRecording(false);
      } catch (error) {
        console.error('Error recording video:', error);
        setIsRecording(false);
        Alert.alert('Recording Error', 'Failed to record video. Please try again.');
      }
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current) {
      try {
        await cameraRef.current.stopRecording();
        setIsRecording(false);
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }
  };

  const retakeVideo = () => {
    setRecordedVideo(null);
  };

  const uploadVideo = async () => {
    if (!recordedVideo || !session?.user) return;

    setIsUploading(true);
    try {
      // Read the video file
      const response = await fetch(recordedVideo);
      const blob = await response.blob();
      
      // Generate a unique scan ID
      const scanId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const filePath = `scans/${session.user.id}/${scanId}.mp4`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('body-scans')
        .upload(filePath, blob, {
          contentType: 'video/mp4',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Update profile status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ body_scan_status: 'uploaded' })
        .eq('id', session.user.id);

      if (updateError) {
        throw updateError;
      }

      // Navigate to progress screen
      navigation.navigate('ScanProgress' as never);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload your scan. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (recordedVideo) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Preview Your Scan</Text>
        <Video
          style={styles.preview}
          source={{ uri: recordedVideo }}
          useNativeControls
          // Removed resizeMode property that causes type error
          isLooping
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={retakeVideo}>
            <Text style={styles.secondaryButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, isUploading && styles.disabledButton]} 
            onPress={uploadVideo}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Use This Scan</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Body Scan Setup</Text>
      <Text style={styles.instructions}>
        Please follow these instructions for an accurate scan:
      </Text>
      <View style={styles.instructionList}>
        <Text style={styles.instruction}>• Wear form-fitting clothes</Text>
        <Text style={styles.instruction}>• Stand in a well-lit area</Text>
        <Text style={styles.instruction}>• Turn slowly 360° during recording</Text>
        <Text style={styles.instruction}>• Keep your arms slightly away from your body</Text>
      </View>
      
      <View style={styles.cameraContainer}>
        <CameraView 
          style={styles.camera} 
          facing={facing}
          ref={cameraRef}
          // Removed videoCodec property that doesn't exist in the type
        >
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}
            >
              <Text style={styles.flipButtonText}>Flip Camera</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
      
      <TouchableOpacity
        style={[
          styles.recordButton,
          isRecording && styles.recordingButton
        ]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text style={styles.recordButtonText}>
          {isRecording ? 'STOP' : 'RECORD'}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.recordingHint}>
        {isRecording 
          ? 'Recording... Hold for 10-15 seconds' 
          : 'Press record and turn slowly 360°'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  instructionList: {
    marginBottom: 20,
  },
  instruction: {
    fontSize: 14,
    marginBottom: 8,
    color: '#555',
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 20,
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 20,
  },
  flipButtonText: {
    color: 'white',
    fontSize: 14,
  },
  recordButton: {
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingButton: {
    backgroundColor: '#cc0000',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordingHint: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  preview: {
    flex: 1,
    width: '100%',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
});