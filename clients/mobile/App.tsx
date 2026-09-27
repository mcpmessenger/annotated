import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { registerRootComponent } from 'expo';
import * as Linking from 'expo-linking';
import { Colors } from './src/theme/colors';
import { FeedScreen } from './src/screens/FeedScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { ComposeModal } from './src/components/ComposeModal';
import { parseDeepLink } from './src/services/deepLink';
import { parseSharedContent, ParsedVideoSource } from './src/services/shareIntent';
import { NoteItem } from './src/services/supabase';

export default function App() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  // Floating Bubble State
  
  // Compose Modal State for Share Target & Bubble Tap
  const [isComposeVisible, setIsComposeVisible] = useState(false);
  const [sharedSource, setSharedSource] = useState<ParsedVideoSource | null>(null);

  // Handle incoming deep-links and shared intents
  const handleIncomingUrl = (url: string | null) => {
    if (!url) return;
    const parsed = parseDeepLink(url);

    // 1. Roku TV QR pass or slug link
    if (parsed.type === 'note' && parsed.slug) {
      setActiveSlug(parsed.slug);
      return;
    }

    // 2. Android Share Target receiving shared URL from YouTube / X
    if (parsed.type === 'share' && parsed.sharedUrl) {
      const videoSource = parseSharedContent(parsed.sharedUrl);
      if (videoSource) {
        setSharedSource(videoSource);
        setIsComposeVisible(true);
      }
    }
  };

  useEffect(() => {
    // Cold start
    Linking.getInitialURL().then(handleIncomingUrl);

    // Running in background
    const sub = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });

    return () => {
      sub.remove();
    };
  }, []);

  const handleManualCompose = () => {
    setSharedSource(null);
    setIsComposeVisible(true);
  };

  const handleComposeSuccess = (newNote: NoteItem) => {
    setIsComposeVisible(false);
    setSelectedNote(newNote);
    setActiveSlug(newNote.slug || newNote.id);
    Alert.alert('Published!', 'Your annotation is now live on the network, Web, and Roku TV.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {activeSlug ? (
        <DetailScreen
          slugOrId={activeSlug}
          initialNote={selectedNote}
          onBack={() => {
            setActiveSlug(null);
            setSelectedNote(null);
          }}
        />
      ) : (
        <FeedScreen
          onSelectNote={(note) => {
            setSelectedNote(note);
            setActiveSlug(note.slug || note.id);
          }}
          onOpenScanner={() => {
            Alert.alert(
              'Roku TV Mobile Pass',
              'Point your phone camera at the QR code on your TV screen to sync the live note.'
            );
          }}
          onCompose={handleManualCompose}
        />
      )}

      
      {/* Quick Compose Modal (Opened via Floating Bubble, Android Share, or '+' button) */}
      <ComposeModal
        visible={isComposeVisible}
        source={sharedSource}
        onClose={() => setIsComposeVisible(false)}
        onSuccess={handleComposeSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

registerRootComponent(App);


