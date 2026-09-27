import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { OverlayController } from '../services/overlay';

interface HeaderProps {
  onScanPress?: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onScanPress, title = 'annotated' }) => {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <Text style={styles.logoText}>
          {title}
          <Text style={styles.dot}>.</Text>
        </Text>
        <TouchableOpacity
          style={styles.floatingBubbleToggle}
          onPress={() => OverlayController.requestOverlayPermission()}
        >
          <Text style={styles.floatingBubbleText}>⚡ FLOAT BUBBLE</Text>
        </TouchableOpacity>
      </View>

      {onScanPress && (
        <TouchableOpacity style={styles.scanButton} onPress={onScanPress}>
          <Text style={styles.scanButtonText}>TV PASS 📺</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  dot: {
    color: Colors.red,
  },
  floatingBubbleToggle: {
    backgroundColor: '#0F2840',
    borderColor: Colors.cyan,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  floatingBubbleText: {
    color: Colors.cyan,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scanButton: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.borderHover,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scanButtonText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
});
