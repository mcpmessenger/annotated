import { Platform, Linking, Alert } from 'react-native';

export class OverlayController {
  // Checks and prompts for Android's "Display over other apps" permission
  static async requestOverlayPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    Alert.alert(
      'Display Over Other Apps',
      'To enable the persistent Annotated floating bubble over YouTube, X, and Chrome tabs, please grant the "Display over other apps" permission in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            // Opens Android's system overlay management screen
            Linking.openSettings();
          },
        },
      ]
    );

    return true;
  }
}
