import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../theme/colors';
import { NoteItem } from '../services/supabase';
import { ReactionBar } from './ReactionBar';
import { FactCheckCard } from './FactCheckCard';

interface NoteCardProps {
  note: NoteItem;
  onPress?: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onPress }) => {
  const hasQuote = Boolean(note.quoteText && note.quoteText.trim().length > 0);
  const hasComment = Boolean(note.commentary && note.commentary.trim().length > 0);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
    >
      {/* Top Author & Source Header */}
      <View style={styles.header}>
        <View style={styles.authorBadge}>
          <Text style={styles.authorText}>{note.author}</Text>
        </View>
        <View style={styles.hostBadge}>
          <Text style={styles.hostnameText}>{note.hostname || 'web'}</Text>
        </View>
      </View>

      {/* Video Thumbnail (for YouTube/video annotations) */}
      {note.thumbnailUrl && (
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: note.thumbnailUrl }} style={styles.thumbnail} />
          <View style={styles.playBadge}>
            <Text style={styles.playBadgeText}>▶ CLIP</Text>
          </View>
        </View>
      )}

      {/* Quote / Primary Source */}
      {hasQuote && (
        <View style={styles.quoteBox}>
          <Text style={styles.quoteLabel}>PRIMARY SOURCE / QUOTE</Text>
          <Text style={styles.quoteText} numberOfLines={4}>
            "{note.quoteText}"
          </Text>
        </View>
      )}

      {/* Community Commentary */}
      {hasComment ? (
        <View style={styles.commentaryRow}>
          <Text style={styles.emoji}>{note.emoji || '💡'}</Text>
          <Text style={styles.commentaryText}>{note.commentary}</Text>
        </View>
      ) : (
        <View style={styles.commentaryRow}>
          <Text style={styles.emoji}>{note.emoji || '💡'}</Text>
          <Text style={[styles.commentaryText, { fontStyle: 'italic', color: Colors.textMuted }]}>
            Verified community annotation attached to source
          </Text>
        </View>
      )}

      {/* Fact Check Section */}
      <FactCheckCard factCheck={note.fact_check} />

      {/* Interactive Reaction Pills */}
      <ReactionBar initialReactions={note.reactions} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorBadge: {
    backgroundColor: '#0F2840',
    borderColor: Colors.cyan,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  authorText: {
    color: Colors.cyan,
    fontSize: 12,
    fontWeight: '800',
  },
  hostBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  hostnameText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  playBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderColor: Colors.cyan,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playBadgeText: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '800',
  },
  quoteBox: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.cyan,
    paddingLeft: 10,
    marginBottom: 10,
    backgroundColor: '#091322',
    paddingVertical: 6,
    borderRadius: 4,
  },
  quoteLabel: {
    color: Colors.cyan,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  quoteText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  commentaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 6,
  },
  emoji: {
    fontSize: 18,
  },
  commentaryText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
});
