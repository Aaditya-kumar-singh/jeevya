import 'expo-router/entry';

import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from 'react-native-android-widget';

import { JeevyaWidgetConfigurationScreen } from './src/widgets/JeevyaWidgetConfigurationScreen';
import { widgetTaskHandler } from './src/widgets/jeevyaWidgetTaskHandler';

registerWidgetTaskHandler(widgetTaskHandler);
registerWidgetConfigurationScreen(JeevyaWidgetConfigurationScreen);
