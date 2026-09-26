import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';

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
        <View style={styles.badge}>
          <Text style={styles.badgeText}>LIVE NETWORK</Text>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  dot: {
    color: Colors.red,
  },
  badge: {
    backgroundColor: '#0F2338',
    borderColor: Colors.cyan,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: Colors.cyan,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scanButton: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.borderHover,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scanButtonText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
