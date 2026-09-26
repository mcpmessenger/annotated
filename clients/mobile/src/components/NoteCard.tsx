import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { NoteItem } from '../services/supabase';
import { ReactionBar } from './ReactionBar';
import { FactCheckCard } from './FactCheckCard';

interface NoteCardProps {
  note: NoteItem;
  onPress?: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onPress }) => {
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
        <Text style={styles.hostnameText}>{note.hostname || 'source'}</Text>
      </View>

      {/* Quote / Primary Source */}
      {note.quoteText ? (
        <View style={styles.quoteBox}>
          <Text style={styles.quoteText} numberOfLines={3}>
            "{note.quoteText}"
          </Text>
        </View>
      ) : null}

      {/* Community Commentary */}
      <View style={styles.commentaryRow}>
        <Text style={styles.emoji}>{note.emoji || '💡'}</Text>
        <Text style={styles.commentaryText}>{note.commentary}</Text>
      </View>

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
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  hostnameText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  quoteBox: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.cyan,
    paddingLeft: 10,
    marginBottom: 10,
  },
  quoteText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  commentaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 4,
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
