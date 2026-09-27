import { Alert, NativeModules, Platform } from 'react-native';

const { OverlayModule } = NativeModules;

export class OverlayController {
  private static isOverlayActive = false;

  static async toggleOverlay(onStateChanged: (isActive: boolean) => void) {
    this.isOverlayActive = !this.isOverlayActive;
    onStateChanged(this.isOverlayActive);

    if (this.isOverlayActive) {
      if (Platform.OS === 'android' && OverlayModule) {
        try {
          OverlayModule.startBubble();
        } catch (e) {
          console.warn('[Overlay] Could not start native bubble:', e);
        }
      }
      Alert.alert(
        'Floating Bubble Active ⚡',
        'Persistent bubble is active over other apps! You can switch to YouTube or X and annotate directly from your screen.',
        [{ text: 'Awesome' }]
      );
    } else {
      if (Platform.OS === 'android' && OverlayModule) {
        try {
          OverlayModule.stopBubble();
        } catch (e) {
          console.warn('[Overlay] Could not stop native bubble:', e);
        }
      }
      Alert.alert('Floating Bubble Minimized', 'Overlay bubble has been docked.');
    }
  }
}
