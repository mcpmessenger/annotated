import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../theme/colors';
import { NoteItem, fetchAnnotationBySlug } from '../services/supabase';
import { ReactionBar } from '../components/ReactionBar';
import { FactCheckCard } from '../components/FactCheckCard';

interface DetailScreenProps {
  slugOrId: string;
  initialNote?: NoteItem | null;
  onBack: () => void;
}

export const DetailScreen: React.FC<DetailScreenProps> = ({ slugOrId, initialNote, onBack }) => {
  const [note, setNote] = useState<NoteItem | null>(initialNote || null);
  const [loading, setLoading] = useState(!initialNote);

  useEffect(() => {
    if (!initialNote) {
      fetchAnnotationBySlug(slugOrId).then((data) => {
        setNote(data);
        setLoading(false);
      });
    }
  }, [slugOrId]);

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back to Feed</Text>
        </TouchableOpacity>
        <View style={styles.tvBadge}>
          <Text style={styles.tvBadgeText}>ROKU TV PASS ACTIVE</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.cyan} />
          <Text style={styles.loadingText}>Connecting to TV Note...</Text>
        </View>
      ) : note ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Author Badge */}
          <View style={styles.metaRow}>
            <View style={styles.authorBadge}>
              <Text style={styles.authorText}>{note.author}</Text>
            </View>
            <Text style={styles.hostname}>{note.hostname || 'primary source'}</Text>
          </View>

          {/* Primary Source Quote */}
          {note.quoteText ? (
            <View style={styles.quoteCard}>
              <Text style={styles.label}>PRIMARY SOURCE</Text>
              <Text style={styles.quoteText}>"{note.quoteText}"</Text>
            </View>
          ) : null}

          {/* Community Note Commentary */}
          <View style={styles.annotationCard}>
            <Text style={styles.label}>COMMUNITY ANNOTATION</Text>
            <View style={styles.commentaryRow}>
              <Text style={styles.emoji}>{note.emoji || '💡'}</Text>
              <Text style={styles.commentaryText}>{note.commentary}</Text>
            </View>
          </View>

          {/* Fact Check Section */}
          <Text style={[styles.label, { marginTop: 16 }]}>VERIFICATION & CONSENSUS</Text>
          <FactCheckCard factCheck={note.fact_check} />

          {/* Live Reactions */}
          <Text style={[styles.label, { marginTop: 20 }]}>LIVE REACTIONS</Text>
          <ReactionBar initialReactions={note.reactions} />
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Text style={styles.errorText}>Annotation not found.</Text>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Return to Feed</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
  },
  backButtonText: {
    color: Colors.cyan,
    fontSize: 13,
    fontWeight: '700',
  },
  tvBadge: {
    backgroundColor: '#052e16',
    borderColor: Colors.emerald,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tvBadgeText: {
    color: Colors.emerald,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  content: {
    padding: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorBadge: {
    backgroundColor: '#0F2840',
    borderColor: Colors.cyan,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  authorText: {
    color: Colors.cyan,
    fontSize: 14,
    fontWeight: '800',
  },
  hostname: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  label: {
    color: Colors.cyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  quoteCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: Colors.cyan,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  quoteText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  annotationCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  commentaryRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  emoji: {
    fontSize: 22,
  },
  commentaryText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    flex: 1,
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
  },
  errorText: {
    color: Colors.red,
    fontSize: 16,
    fontWeight: '700',
  },
});
