import 'expo-router/entry';

import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from 'react-native-android-widget';

import { LifeOSWidgetConfigurationScreen } from './src/widgets/LifeOSWidgetConfigurationScreen';
import { widgetTaskHandler } from './src/widgets/lifeosWidgetTaskHandler';

registerWidgetTaskHandler(widgetTaskHandler);
registerWidgetConfigurationScreen(LifeOSWidgetConfigurationScreen);
