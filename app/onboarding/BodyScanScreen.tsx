import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BodyScanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Body Scan</Text>
      <Text>Scan your body measurements here</Text>
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