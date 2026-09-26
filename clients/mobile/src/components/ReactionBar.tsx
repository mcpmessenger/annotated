import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface ReactionBarProps {
  initialReactions?: Record<string, number>;
  onReact?: (emoji: string) => void;
}

const EMOJIS = ['🔥', '🤔', '💡', '💯', '👎'];

export const ReactionBar: React.FC<ReactionBarProps> = ({
  initialReactions = {},
  onReact,
}) => {
  const [reactions, setReactions] = useState<Record<string, number>>({
    '🔥': initialReactions['🔥'] || 0,
    '🤔': initialReactions['🤔'] || 0,
    '💡': initialReactions['💡'] || 0,
    '💯': initialReactions['💯'] || 0,
    '👎': initialReactions['👎'] || 0,
  });
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const handlePress = (emoji: string) => {
    setSelectedEmoji(emoji);
    setReactions((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1,
    }));
    onReact?.(emoji);
  };

  return (
    <View style={styles.container}>
      {EMOJIS.map((emoji) => {
        const isSelected = selectedEmoji === emoji;
        const count = reactions[emoji] || 0;
        return (
          <TouchableOpacity
            key={emoji}
            onPress={() => handlePress(emoji)}
            style={[styles.pill, isSelected && styles.pillSelected]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={[styles.count, isSelected && styles.countSelected]}>
              {count}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  pillSelected: {
    backgroundColor: '#0F2840',
    borderColor: Colors.cyan,
  },
  emoji: {
    fontSize: 14,
  },
  count: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  countSelected: {
    color: Colors.cyan,
  },
});
