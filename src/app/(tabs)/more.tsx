import { Pressable, ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { BookOpen, ChevronRight, NotebookPen, Settings } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

const links: {
  label: string;
  value: string;
  href: '/books' | '/journal' | '/settings';
  icon: typeof BookOpen;
}[] = [
  { label: 'Books', value: 'Reading list + progress', href: '/books', icon: BookOpen },
  { label: 'Journal', value: 'Reflect daily', href: '/journal', icon: NotebookPen },
  { label: 'Settings', value: 'Profile + app prefs', href: '/settings', icon: Settings },
];

export default function MoreScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            LifeOS
          </Text>
          <Heading size="xl" className="mt-1">
            More
          </Heading>
          <Text size="sm" className="mt-1 text-muted-foreground">
            Growth, reflection, and settings
          </Text>
        </View>

        <View className="gap-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.label} href={link.href as any} asChild>
                <Pressable>
                  <Card className="w-full p-4">
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Icon size={18} />
                      </View>
                      <View className="flex-1">
                        <Heading size="sm">{link.label}</Heading>
                        <Text size="sm" className="text-muted-foreground">
                          {link.value}
                        </Text>
                      </View>
                      <ChevronRight size={18} />
                    </View>
                  </Card>
                </Pressable>
              </Link>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

