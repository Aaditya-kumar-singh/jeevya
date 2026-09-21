import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data, loading, error, search } = useUnifiedSearch();
  useEffect(() => { const timer = setTimeout(() => { void search(query); }, 250); return () => clearTimeout(timer); }, [query, search]);
  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="gap-4 px-5 pt-14">
        <View className="flex-row items-center gap-3"><Button variant="ghost" size="icon" onPress={() => router.back()}><ArrowLeft size={20} /></Button><View className="flex-1"><Text size="sm" className="text-muted-foreground">Jeevya</Text><Heading size="xl" className="mt-1">Search Everything</Heading></View><SearchIcon size={24} className="text-primary" /></View>
        <View className="flex-row items-center rounded-2xl border border-border bg-card px-3"><SearchIcon size={18} className="text-muted-foreground" /><TextInput value={query} onChangeText={setQuery} placeholder="Search tasks, habits, books, journal..." placeholderTextColor="#888" autoFocus className="flex-1 px-3 py-3 text-foreground" /></View>
        {error ? <Card className="p-3"><Text size="xs" className="text-red-600 dark:text-red-400">{error}</Text></Card> : null}
        {loading ? <View className="items-center py-4"><ActivityIndicator /></View> : null}
        {!loading && query.trim() && data?.results.length === 0 ? <Card className="items-center p-6"><Heading size="md">No matches</Heading><Text size="sm" className="mt-1 text-center text-muted-foreground">Try a task, habit, book, journal entry, transaction, or goal name.</Text></Card> : null}
        {data?.results.map((result) => <Pressable key={`${result.domain}-${result.id}`} onPress={() => router.push(result.route as never)}><Card className="p-4"><View className="flex-row items-center gap-3"><View className="flex-1"><Text size="xs" className="uppercase text-muted-foreground">{result.domain}</Text><Heading size="sm" className="mt-1">{result.title}</Heading>{result.subtitle ? <Text size="xs" className="mt-1 text-muted-foreground">{result.subtitle}</Text> : null}</View><Text size="xs" className="text-primary">Open</Text></View></Card></Pressable>)}
      </View>
    </ScrollView>
  );
}
