import React, { useRef, useState } from 'react';
import {
  PanResponder,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { Colors } from '../theme/colors';

interface FloatingBubbleProps {
  visible: boolean;
  onPress: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUBBLE_SIZE = 56;

export const FloatingBubble: React.FC<FloatingBubbleProps> = ({ visible, onPress }) => {
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - BUBBLE_SIZE - 20, y: SCREEN_HEIGHT / 2 })).current;
  const [isDragging, setIsDragging] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(false);
        pan.extractOffset();
      },
      onPanResponderMove: (e, gestureState) => {
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          setIsDragging(true);
        }
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (e, gestureState) => {
        pan.flattenOffset();
        // Snap to nearest edge (left or right)
        const currentX = (pan.x as any)._value || 0;
        const targetX = currentX > SCREEN_WIDTH / 2 ? SCREEN_WIDTH - BUBBLE_SIZE - 16 : 16;
        
        Animated.spring(pan.x, {
          toValue: targetX,
          useNativeDriver: false,
          friction: 6,
        }).start();

        if (!isDragging && Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          onPress();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={styles.innerTouch}
      >
        <Text style={styles.icon}>✏️</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: '#0F172A',
    borderColor: Colors.cyan,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 99999,
  },
  innerTouch: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
});
