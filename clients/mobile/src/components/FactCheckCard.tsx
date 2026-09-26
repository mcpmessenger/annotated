import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface FactCheckProps {
  factCheck?: {
    status?: string;
    verdict?: string;
    headline?: string;
    detail?: string;
    explanation?: string;
  };
}

export const FactCheckCard: React.FC<FactCheckProps> = ({ factCheck }) => {
  if (!factCheck) return null;

  const verdict = factCheck.verdict?.toUpperCase() || factCheck.status?.toUpperCase() || 'VERIFIED';
  const isFalse = verdict === 'FALSE' || verdict.includes('FALSE');
  const isContext = verdict.includes('CONTEXT') || verdict.includes('MISLEADING');

  const statusColor = isFalse ? Colors.falseClaim : isContext ? Colors.contextNeeded : Colors.verified;
  const statusHeadline = factCheck.headline || (isFalse ? 'FACT CHECK: FALSE CLAIM' : isContext ? 'FACT CHECK: NEEDS CONTEXT' : 'VERIFIED ACCURATE');
  const detail = factCheck.explanation || factCheck.detail || 'Consensus evaluated with primary sources.';

  return (
    <View style={[styles.container, { borderLeftColor: statusColor }]}>
      <Text style={[styles.headline, { color: statusColor }]}>
        {statusHeadline}
      </Text>
      <Text style={styles.detail}>
        {detail}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceElevated,
    borderLeftWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  headline: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detail: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
});
