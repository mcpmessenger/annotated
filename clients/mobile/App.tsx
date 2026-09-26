import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Colors } from './src/theme/colors';
import { FeedScreen } from './src/screens/FeedScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { parseDeepLink } from './src/services/deepLink';
import { NoteItem } from './src/services/supabase';

export default function App() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  // Handle deep-linking (Roku TV QR Pass or Universal Link)
  useEffect(() => {
    // 1. App opened from cold start via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        const parsed = parseDeepLink(url);
        if (parsed.type === 'note' && parsed.slug) {
          setActiveSlug(parsed.slug);
        }
      }
    });

    // 2. App running in background receiving URL
    const subscription = Linking.addEventListener('url', (event) => {
      const parsed = parseDeepLink(event.url);
      if (parsed.type === 'note' && parsed.slug) {
        setActiveSlug(parsed.slug);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleSelectNote = (note: NoteItem) => {
    setSelectedNote(note);
    setActiveSlug(note.slug || note.id);
  };

  const handleBackToFeed = () => {
    setActiveSlug(null);
    setSelectedNote(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      {activeSlug ? (
        <DetailScreen
          slugOrId={activeSlug}
          initialNote={selectedNote}
          onBack={handleBackToFeed}
        />
      ) : (
        <FeedScreen
          onSelectNote={handleSelectNote}
          onOpenScanner={() => {
            // Scanner placeholder for Roku TV camera capture
            alert('Point your camera at the Roku TV QR code to open the active note.');
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
