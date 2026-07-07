import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import { useNavigation } from '@react-navigation/native';
import { Garment } from '../../lib/database.types';

export default function WardrobeScreen({ navigation }: { navigation: any }) {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { session } = useAuth();
  const nav = useNavigation();

  const fetchGarments = useCallback(async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from('garments')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGarments(data || []);
    } catch (error) {
      console.error('Error fetching garments:', error);
      Alert.alert('Error', 'Failed to fetch garments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    fetchGarments();
  }, [fetchGarments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGarments();
  }, [fetchGarments]);

  const renderGarmentItem = ({ item }: { item: Garment }) => (
    <TouchableOpacity
      style={styles.garmentCard}
      onPress={() => navigation.navigate('GarmentDetail', { id: item.id })}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image_url }} style={styles.garmentImage} resizeMode="cover" />
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
          <Text style={styles.typeBadgeText}>{item.type}</Text>
        </View>
      </View>
      <Text style={styles.nickname} numberOfLines={1} ellipsizeMode="tail">
        {item.nickname || 'Unnamed Garment'}
      </Text>
    </TouchableOpacity>
  );

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      top: '#FF6B6B',
      bottom: '#4ECDC4',
      dress: '#FFBE0B',
      outerwear: '#8338EC',
      shoes: '#FB5607',
      accessory: '#3A86FF',
    };
    return colors[type] || '#666666';
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateText}>Upload your first garment</Text>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => navigation.navigate('GarmentUpload')}
      >
        <Text style={styles.uploadButtonText}>Upload Garment</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[...Array(4)].map((_, index) => (
        <View key={index} style={styles.skeletonCard} />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={garments}
        renderItem={renderGarmentItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={garments.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={loading ? renderSkeleton : renderEmptyState}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>My Wardrobe</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('GarmentUpload')}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  garmentCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 5,
    width: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  garmentImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  typeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#666666',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  nickname: {
    padding: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
  },
  skeletonCard: {
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    margin: 5,
    width: '48%',
    height: 200,
  },
});