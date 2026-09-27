import { Alert } from 'react-native';

export class OverlayController {
  private static isOverlayActive = false;

  static toggleOverlay(onStateChanged: (isActive: boolean) => void) {
    this.isOverlayActive = !this.isOverlayActive;
    onStateChanged(this.isOverlayActive);

    if (this.isOverlayActive) {
      Alert.alert(
        'Floating Bubble Active ⚡',
        'Overlay permission is granted! The persistent floating bubble is active. You can also highlight any text in X or Chrome and tap Annotated to drop notes directly.',
        [{ text: 'Awesome' }]
      );
    } else {
      Alert.alert('Floating Bubble Minimized', 'Overlay bubble has been docked.');
    }
  }
}
