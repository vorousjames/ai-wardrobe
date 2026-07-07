import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Alert, View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import LoginScreen from './app/auth/LoginScreen';
import SignUpScreen from './app/auth/SignUpScreen';
import WardrobeScreen from './app/tabs/WardrobeScreen';
import OutfitBuilderScreen from './app/tabs/OutfitBuilderScreen';
import ProfileScreen from './app/tabs/ProfileScreen';
import GarmentUploadScreen from './app/wardrobe/GarmentUploadScreen';
import GarmentDetailScreen from './app/wardrobe/GarmentDetailScreen';
import BodyScanScreen from './app/onboarding/BodyScanScreen';
import ScanProgressScreen from './app/onboarding/ScanProgressScreen';
import RenderResultScreen from './app/outfit/RenderResultScreen';
import { AuthProvider, useAuth } from './lib/authContext';
import { supabase } from './lib/supabase';
import { LoRAService } from './lib/rendering/LoRAService';
import { RenderPipeline } from './lib/rendering/RenderPipeline';

const Tab = createBottomTabNavigator();

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Wardrobe" 
        component={WardrobeScreen} 
        options={{ 
          tabBarLabel: 'Wardrobe',
          tabBarIcon: () => <TabIcon emoji="👕" />
        }} 
      />
      <Tab.Screen 
        name="Outfits" 
        component={OutfitBuilderScreen} 
        options={{ 
          tabBarLabel: 'Outfits',
          tabBarIcon: () => <TabIcon emoji="✨" />
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          tabBarLabel: 'Profile',
          tabBarIcon: () => <TabIcon emoji="👤" />
        }} 
      />
    </Tab.Navigator>
  );
}

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen name="GarmentUpload" component={GarmentUploadScreen} />
      <Stack.Screen name="GarmentDetail" component={GarmentDetailScreen} />
      <Stack.Screen name="BodyScan" component={BodyScanScreen} />
      <Stack.Screen name="ScanProgress" component={ScanProgressScreen} />
      <Stack.Screen name="RenderResult" component={RenderResultScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const [loraLoading, setLoraLoading] = useState(false);

  useEffect(() => {
    if (loading) return;

    const determineInitialRoute = async () => {
      if (session) {
        try {
          // Pre-download LoRA weights in background
          setLoraLoading(true);
          const loraService = new LoRAService();
          try {
            await loraService.loadUserLoRA(session.user.id);
            console.log('LoRA weights pre-downloaded successfully');
          } catch (error) {
            console.warn('Failed to pre-download LoRA weights:', error);
          } finally {
            setLoraLoading(false);
          }

          // Warm up render pipeline in background
          const renderPipeline = new RenderPipeline();
          try {
            await renderPipeline.warmUp();
            console.log('Render pipeline warmed up successfully');
          } catch (error) {
            console.warn('Failed to warm up render pipeline:', error);
          }

          // Check user's body scan status — only auto-navigate if never started
          const { data, error } = await supabase
            .from('profiles')
            .select('body_scan_status')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Error fetching profile:', error);
            setInitialRoute('MainTabs');
          } else if (data.body_scan_status === 'not_started') {
            // Only redirect to BodyScan on very first launch
            setInitialRoute('MainTabs');
          } else if (data.body_scan_status === 'uploaded' || data.body_scan_status === 'processing') {
            setInitialRoute('ScanProgress');
          } else {
            setInitialRoute('MainTabs');
          }
        } catch (error) {
          console.error('Error determining initial route:', error);
          setInitialRoute('MainTabs');
        }
      } else {
        setInitialRoute(null);
      }
      setRouteLoading(false);
    };

    determineInitialRoute();
  }, [session, loading]);

  if (loading || routeLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      {session ? (
        <Stack.Navigator initialRouteName={initialRoute || 'MainTabs'}>
          <Stack.Screen 
            name="MainTabs" 
            component={TabNavigator} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen name="GarmentUpload" component={GarmentUploadScreen} />
          <Stack.Screen name="GarmentDetail" component={GarmentDetailScreen} />
          <Stack.Screen name="BodyScan" component={BodyScanScreen} />
          <Stack.Screen name="ScanProgress" component={ScanProgressScreen} />
          <Stack.Screen name="RenderResult" component={RenderResultScreen} />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  const [otaStatus, setOtaStatus] = useState<'checking' | 'ready' | 'done'>('checking');
  const [otaMessage, setOtaMessage] = useState('Checking for updates...');

  // OTA check on every cold start — visible so you know it's running
  useEffect(() => {
    (async () => {
      try {
        setOtaMessage('Checking for updates...');
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setOtaMessage('Downloading update...');
          await Updates.fetchUpdateAsync();
          setOtaMessage('Applying update...');
          await Updates.reloadAsync();
        } else {
          setOtaMessage('App is up to date');
          await new Promise(r => setTimeout(r, 800));
          setOtaStatus('done');
        }
      } catch {
        // Network error or updates disabled — proceed to app
        setOtaStatus('done');
      }
    })();
  }, []);

  if (otaStatus === 'checking') {
    return (
      <View style={styles.otaContainer}>
        <Text style={styles.otaTitle}>ai-wardrobe</Text>
        <ActivityIndicator size="large" color="#007AFF" style={styles.otaSpinner} />
        <Text style={styles.otaMessage}>{otaMessage}</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  otaContainer: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  otaTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  otaSpinner: {
    marginBottom: 20,
  },
  otaMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});