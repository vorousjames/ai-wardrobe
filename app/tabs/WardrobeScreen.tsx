import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function WardrobeScreen() {
  const [connectionStatus, setConnectionStatus] = useState('Checking...');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Test the connection by fetching the profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);

        if (error) {
          setConnectionStatus(`Error: ${error.message}`);
        } else {
          setConnectionStatus('Connected to Supabase successfully!');
        }
      } catch (err) {
        setConnectionStatus(`Connection failed: ${err}`);
      }
    };

    checkConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wardrobe</Text>
      <Text style={styles.status}>{connectionStatus}</Text>
      <Text>Your wardrobe items will appear here</Text>
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
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
});