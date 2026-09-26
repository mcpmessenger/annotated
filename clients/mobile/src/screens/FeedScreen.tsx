import React, { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { fetchAnnotationsFeed, NoteItem } from '../services/supabase';

interface FeedScreenProps {
  onSelectNote: (note: NoteItem) => void;
  onOpenScanner: () => void;
  onCompose: () => void;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({
  onSelectNote,
  onOpenScanner,
  onCompose,
}) => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = async () => {
    const items = await fetchAnnotationsFeed();
    setNotes(items);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadFeed();
  };

  return (
    <View style={styles.container}>
      <Header onScanPress={onOpenScanner} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.cyan} />
          <Text style={styles.loadingText}>Syncing Annotated Feed...</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteCard note={item} onPress={() => onSelectNote(item)} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.cyan}
              colors={[Colors.cyan]}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Floating Action Button (Compose Note) */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={onCompose}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingVertical: 10,
    paddingBottom: 80,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.cyan,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#000000',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
  },
});
