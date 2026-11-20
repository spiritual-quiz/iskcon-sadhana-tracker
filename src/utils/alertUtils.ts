import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Universal cross-platform alert utility.
 * React Native Web's built-in `Alert.alert` is a no-op dummy function (`alert() {}`),
 * which causes completely silent failures on web.
 * This helper bridges `window.alert` and `window.confirm` on web while preserving
 * standard native Alert on iOS and Android.
 */
export const showCrossPlatformAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  const fullMessage = title + (message ? `\n\n${message}` : '');

  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const cancelButton = buttons.find((b) => b.style === 'cancel');
      const actionButton = buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];

      const confirmed =
        typeof window !== 'undefined' && window.confirm ? window.confirm(fullMessage) : true;

      if (confirmed) {
        actionButton?.onPress?.();
      } else {
        cancelButton?.onPress?.();
      }
    } else {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(fullMessage);
      }
      buttons?.[0]?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
