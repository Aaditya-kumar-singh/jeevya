import { ScrollView, View } from 'react-native';
import { Bell, ChevronRight, Palette, User, Database } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { settingsSections } from '@/lib/mockData';

const icons: Record<string, typeof User> = {
  profile: User,
  appearance: Palette,
  notifications: Bell,
  data: Database,
};

export default function SettingsScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            LifeOS
          </Text>
          <Heading size="xl" className="mt-1">
            Settings
          </Heading>
        </View>

        <View className="gap-3">
          {settingsSections.map((section) => {
            const Icon = icons[section.id] ?? User;
            return (
              <Card key={section.id} className="w-full p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Icon size={18} />
                  </View>
                  <View className="flex-1">
                    <Heading size="sm">{section.title}</Heading>
                    <Text size="sm" className="text-muted-foreground">
                      {section.subtitle}
                    </Text>
                  </View>
                  <ChevronRight size={18} />
                </View>
              </Card>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

