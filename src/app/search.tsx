import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search as SearchIcon, X } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import { clearRecentSearches, getRecentSearches, recordRecentSearch, removeRecentSearch } from '@/services/searchHistory';
import { getCategories } from '@/services/finance';
import { SEARCH_DOMAINS, type SearchDomain, type SearchFilters } from '@/types/unifiedSearch';

const financeSources = ['manual', 'payment_notification', 'statement_import', 'share_import', 'api', 'other'];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [domains, setDomains] = useState<SearchDomain[]>([]);
  const [financeType, setFinanceType] = useState<'income' | 'expense' | 'transfer' | undefined>(undefined);
  const [financeSource, setFinanceSource] = useState<string | undefined>();
  const [financeCategoryId, setFinanceCategoryId] = useState<string | undefined>();
  const [financeCategories, setFinanceCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const { data, loading, error, search } = useUnifiedSearch();

  const filters = useMemo<SearchFilters>(() => ({
    domains: domains.length ? domains : undefined,
    finance: financeType || financeSource || minAmount || maxAmount || startDate || endDate
      ? {
          type: financeType,
          source: financeSource,
          categoryId: financeCategoryId,
          minAmount: minAmount ? Number(minAmount) : undefined,
          maxAmount: maxAmount ? Number(maxAmount) : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }
      : undefined,
  }), [domains, financeType, financeSource, financeCategoryId, minAmount, maxAmount, startDate, endDate]);

  useEffect(() => {
    void getRecentSearches().then(setRecent);
    void getCategories().then((items) => setFinanceCategories(items.map((item) => ({ id: item.id, name: item.name }))));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void search(query, filters); }, 220);
    return () => clearTimeout(timer);
  }, [query, filters, search]);

  const submitSearch = useCallback(async (value: string) => {
    const normalized = value.trim();
    setQuery(value);
    if (normalized) setRecent(await recordRecentSearch(normalized));
  }, []);

  const toggleDomain = (domain: SearchDomain) => {
    setDomains((current) => current.includes(domain) ? current.filter((item) => item !== domain) : [...current, domain]);
  };

  const clearFilters = () => {
    setDomains([]);
    setFinanceType(undefined);
    setFinanceSource(undefined);
    setFinanceCategoryId(undefined);
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
  };

  const financeFiltersActive = Boolean(financeType || financeSource || minAmount || maxAmount || startDate || endDate);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <View className="gap-4 px-5 pt-14">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}><ArrowLeft size={20} /></Button>
          <View className="flex-1"><Text size="sm" className="text-muted-foreground">Jeevya</Text><Heading size="xl" className="mt-1">Search Everything</Heading></View>
          <SearchIcon size={24} className="text-primary" />
        </View>

        <View className="flex-row items-center rounded-2xl border border-border bg-card px-3">
          <SearchIcon size={18} className="text-muted-foreground" />
          <TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => void submitSearch(query)} placeholder="Search tasks, habits, books, finance..." placeholderTextColor="#888" autoFocus className="flex-1 px-3 py-3 text-foreground" />
          {query ? <Pressable onPress={() => setQuery('')}><X size={18} className="text-muted-foreground" /></Pressable> : null}
        </View>

        {recent.length > 0 && !query ? (
          <Card className="p-3">
            <View className="mb-2 flex-row items-center justify-between"><Text size="sm" className="font-semibold">Recent searches</Text><Pressable onPress={async () => { await clearRecentSearches(); setRecent([]); }}><Text size="xs" className="text-primary">Clear</Text></Pressable></View>
            <View className="flex-row flex-wrap gap-2">
              {recent.map((item) => <View key={item} className="flex-row items-center rounded-full bg-muted px-3 py-2"><Pressable onPress={() => void submitSearch(item)}><Text size="xs">{item}</Text></Pressable><Pressable className="ml-2" onPress={async () => setRecent(await removeRecentSearch(item))}><X size={12} className="text-muted-foreground" /></Pressable></View>)}
            </View>
          </Card>
        ) : null}

        <Card className="p-3">
          <View className="mb-2 flex-row items-center justify-between"><Text size="sm" className="font-semibold">Search filters</Text><Pressable onPress={clearFilters}><Text size="xs" className="text-primary">Reset</Text></Pressable></View>
          <Text size="xs" className="mb-2 text-muted-foreground">Domains</Text>
          <View className="flex-row flex-wrap gap-2">
            {SEARCH_DOMAINS.map((domain) => <Pressable key={domain} onPress={() => toggleDomain(domain)} className={`rounded-full px-3 py-2 ${domains.includes(domain) ? 'bg-primary' : 'bg-muted'}`}><Text size="xs" className={domains.includes(domain) ? 'text-primary-foreground' : ''}>{domain}</Text></Pressable>)}
          </View>
          <Text size="xs" className="mb-2 mt-4 text-muted-foreground">Finance filters</Text>
          <View className="flex-row flex-wrap gap-2">
            {(['income', 'expense', 'transfer'] as const).map((type) => <Pressable key={type} onPress={() => setFinanceType(financeType === type ? undefined : type)} className={`rounded-full px-3 py-2 ${financeType === type ? 'bg-primary' : 'bg-muted'}`}><Text size="xs">{type}</Text></Pressable>)}
            {financeCategories.map((category) => <Pressable key={category.id} onPress={() => setFinanceCategoryId(financeCategoryId === category.id ? undefined : category.id)} className="rounded-full bg-muted px-3 py-2"><Text size="xs">{category.name}</Text></Pressable>)}
            {financeSources.map((source) => <Pressable key={source} onPress={() => setFinanceSource(financeSource === source ? undefined : source)} className={`rounded-full px-3 py-2 ${financeSource === source ? 'bg-primary' : 'bg-muted'}`}><Text size="xs">{source.replace('_', ' ')}</Text></Pressable>)}
          </View>
          <View className="mt-3 flex-row gap-2">
            <TextInput value={minAmount} onChangeText={setMinAmount} keyboardType="decimal-pad" placeholder="Min amount" placeholderTextColor="#888" className="flex-1 rounded-xl border border-border px-3 py-2 text-foreground" />
            <TextInput value={maxAmount} onChangeText={setMaxAmount} keyboardType="decimal-pad" placeholder="Max amount" placeholderTextColor="#888" className="flex-1 rounded-xl border border-border px-3 py-2 text-foreground" />
          </View>
          <View className="mt-2 flex-row gap-2">
            <TextInput value={startDate} onChangeText={setStartDate} placeholder="Start YYYY-MM-DD" placeholderTextColor="#888" className="flex-1 rounded-xl border border-border px-3 py-2 text-foreground" />
            <TextInput value={endDate} onChangeText={setEndDate} placeholder="End YYYY-MM-DD" placeholderTextColor="#888" className="flex-1 rounded-xl border border-border px-3 py-2 text-foreground" />
          </View>
          {financeFiltersActive ? <Text size="xs" className="mt-2 text-muted-foreground">Finance filters apply when Finance is included in the domain selection.</Text> : null}
        </Card>

        {error ? <Card className="p-3"><Text size="xs" className="text-red-600 dark:text-red-400">{error}</Text></Card> : null}
        {loading ? <View className="items-center py-4"><ActivityIndicator /></View> : null}
        {!loading && query.trim() && data?.results.length === 0 ? <Card className="items-center p-6"><Heading size="md">No matches</Heading><Text size="sm" className="mt-1 text-center text-muted-foreground">Try a different spelling, domain filter, or finance range.</Text></Card> : null}

        {data?.results.map((result) => (
          <Card key={`${result.domain}-${result.id}`} className="p-4">
            <Pressable onPress={() => router.push(result.route as never)}>
              <View className="flex-row items-center gap-3">
                <View className="flex-1"><Text size="xs" className="uppercase text-muted-foreground">{result.domain}</Text><Heading size="sm" className="mt-1">{result.title}</Heading>{result.subtitle ? <Text size="xs" className="mt-1 text-muted-foreground">{result.subtitle}</Text> : null}</View>
                <Text size="xs" className="text-primary">Open</Text>
              </View>
            </Pressable>
            {result.actions?.length ? <View className="mt-3 flex-row flex-wrap gap-2">{result.actions.filter((action) => action.route !== result.route).map((action) => <Pressable key={action.route} onPress={() => router.push(action.route as never)} className="rounded-full bg-muted px-3 py-2"><Text size="xs">{action.label}</Text></Pressable>)}</View> : null}
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

