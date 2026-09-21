import { AppState, Platform } from 'react-native';
import { useEffect } from 'react';

export function AndroidWidgetRefreshBridge() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const refresh = () => {
      void import('@/services/androidWidgetAdapter')
        .then(({ refreshAndroidJeevyaWidgets }) => refreshAndroidJeevyaWidgets())
        .catch(() => {
          // Android/system refresh remains responsible when local refresh is unavailable.
        });
    };

    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => subscription.remove();
  }, []);

  return null;
}
