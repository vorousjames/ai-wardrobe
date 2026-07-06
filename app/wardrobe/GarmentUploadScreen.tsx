import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GarmentUploadScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Garment</Text>
      <Text>Upload your garment images here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});