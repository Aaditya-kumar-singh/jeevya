import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Plus,
  Search,
  Star,
  TrendingUp,
  X,
} from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useBooks } from '@/hooks/useBooks';
import { useBookGoals } from '@/hooks/useBookGoals';
import {
  formatGoalPeriod,
  getGoalProgress,
  isGoalActive,
} from '@/services/book-goals';
import type { BookGoal } from '@/types/book-goals';
import {
  BOOK_STATUS_LABELS,
  bookProgressPercent,
  type Book,
  type BookStatus,
} from '@/types/books';

// ─── Filters & Sorting ────────────────────────────────────────────────────────

type StatusFilter = 'all' | BookStatus;

type LibrarySort =
  | 'recently_added'
  | 'title'
  | 'author'
  | 'progress'
  | 'recently_updated';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'want_to_read', label: 'Want to Read' },
  { key: 'reading', label: 'Reading' },
  { key: 'completed', label: 'Completed' },
];

const SORT_OPTIONS: { key: LibrarySort; label: string }[] = [
  { key: 'recently_added', label: 'Recently Added' },
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'progress', label: 'Progress' },
  { key: 'recently_updated', label: 'Recently Updated' },
];

function statusBadgeVariant(status: BookStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'completed') return 'default';
  if (status === 'reading') return 'secondary';
  return 'outline';
}

/** Case-insensitive search over title + author. */
function matchesQuery(book: Book, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    book.title.toLowerCase().includes(q) ||
    book.author.toLowerCase().includes(q)
  );
}

function compareBooks(sort: LibrarySort): (a: Book, b: Book) => number {
  switch (sort) {
    case 'title':
      return (a, b) =>
        a.title.localeCompare(b.title) || b.createdAt.localeCompare(a.createdAt);
    case 'author':
      return (a, b) =>
        (a.author || '').localeCompare(b.author || '') ||
        a.title.localeCompare(b.title);
    case 'progress':
      return (a, b) => {
        // Unknown totals sort last — never fake a percentage.
        const pa = bookProgressPercent(a);
        const pb = bookProgressPercent(b);
        const va = pa == null ? -1 : pa;
        const vb = pb == null ? -1 : pb;
        return vb - va || a.title.localeCompare(b.title);
      };
    case 'recently_updated':
      return (a, b) =>
        b.updatedAt.localeCompare(a.updatedAt) ||
        b.createdAt.localeCompare(a.createdAt);
    case 'recently_added':
    default:
      return (a, b) => b.createdAt.localeCompare(a.createdAt);
  }
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function OverviewTile({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View
      className="flex-1 items-center rounded-xl bg-muted p-3"
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text size="xl" className="font-bold">
        {value}
      </Text>
      <Text size="xs" className="text-center text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

// ─── Book Card (full library row, unchanged behavior) ─────────────────────────

function BookCard({
  book,
  onPress,
}: {
  book: Book;
  onPress: (id: string) => void;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const progress = bookProgressPercent(book);
  const showCover = book.coverUrl !== '' && !coverFailed;

  return (
    <Pressable
      onPress={() => onPress(book.id)}
      className="min-h-[44px]"
      accessibilityRole="button"
      accessibilityLabel={`Book: ${book.title} by ${book.author || 'unknown author'}, ${BOOK_STATUS_LABELS[book.status]}`}
    >
      <Card className="w-full p-4">
        <View className="flex-row items-center gap-3">
          {showCover ? (
            <Image
              source={{ uri: book.coverUrl }}
              style={{ width: 44, height: 64, borderRadius: 8 }}
              contentFit="cover"
              onError={() => setCoverFailed(true)}
              accessibilityLabel={`Cover of ${book.title}`}
            />
          ) : (
            <View className="h-16 w-11 items-center justify-center rounded-lg bg-muted">
              <BookOpen size={18} className="text-muted-foreground" />
            </View>
          )}
          <View className="flex-1">
            <Heading size="sm">{book.title}</Heading>
            <Text size="sm" className="text-muted-foreground">
              {book.author || 'Unknown author'}
            </Text>
            {book.rating != null ? (
              <View
                className="mt-1 flex-row items-center gap-1"
                accessibilityLabel={`Rated ${book.rating} out of 5`}
              >
                <Star size={12} className="text-amber-500" />
                <Text size="xs" className="text-muted-foreground">
                  {book.rating}/5
                </Text>
              </View>
            ) : null}
          </View>
          <Badge variant={statusBadgeVariant(book.status)}>
            <BadgeText>{BOOK_STATUS_LABELS[book.status]}</BadgeText>
          </Badge>
          <ChevronRight size={18} className="text-muted-foreground" />
        </View>
        {progress != null ? (
          <View>
            <Progress value={progress} className="mt-3">
              <ProgressFilledTrack />
            </Progress>
            <Text
              size="sm"
              className="mt-2 text-muted-foreground"
              accessibilityLabel={`${progress} percent finished, page ${book.currentPage} of ${book.totalPages}`}
            >
              {progress}% finished · p. {book.currentPage}/{book.totalPages}
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

// ─── Continue Reading Row (compact, explicit Continue action) ─────────────────

function ContinueRow({
  book,
  onContinue,
}: {
  book: Book;
  onContinue: (id: string) => void;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const progress = bookProgressPercent(book);
  const showCover = book.coverUrl !== '' && !coverFailed;

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-3">
        {showCover ? (
          <Image
            source={{ uri: book.coverUrl }}
            style={{ width: 44, height: 64, borderRadius: 8 }}
            contentFit="cover"
            onError={() => setCoverFailed(true)}
            accessibilityLabel={`Cover of ${book.title}`}
          />
        ) : (
          <View className="h-16 w-11 items-center justify-center rounded-lg bg-muted">
            <BookOpen size={18} className="text-muted-foreground" />
          </View>
        )}
        <View className="flex-1">
          <Heading size="sm" numberOfLines={1}>
            {book.title}
          </Heading>
          <Text
            size="sm"
            className="text-muted-foreground"
            accessibilityLabel={
              progress != null
                ? `Page ${book.currentPage} of ${book.totalPages}, ${progress} percent`
                : `On page ${book.currentPage}, no page target set`
            }
          >
            {progress != null
              ? `p. ${book.currentPage}/${book.totalPages} · ${progress}%`
              : `p. ${book.currentPage} · no target`}
          </Text>
          {progress != null ? (
            <Progress value={progress} className="mt-2">
              <ProgressFilledTrack />
            </Progress>
          ) : null}
        </View>
      </View>
      <Pressable
        onPress={() => onContinue(book.id)}
        className="mt-3 min-h-[44px] flex-row items-center justify-center gap-1 rounded-lg bg-primary py-2"
        accessibilityRole="button"
        accessibilityLabel={`Continue reading ${book.title}`}
      >
        <Text size="sm" className="font-medium text-primary-foreground">
          Continue
        </Text>
        <ArrowRight size={14} className="text-primary-foreground" />
      </Pressable>
    </Card>
  );
}

// ─── Compact Goal Row (dashboard; full management lives in /books/goals) ──────

function GoalMiniRow({
  goal,
  achieved,
  percent,
  onPress,
}: {
  goal: BookGoal;
  achieved: number;
  percent: number;
  onPress: () => void;
}) {
  const unit = goal.type === 'books' ? 'books' : 'pages';
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[44px] justify-center"
      accessibilityRole="button"
      accessibilityLabel={`Reading goal, ${formatGoalPeriod(goal)}: ${achieved} of ${goal.target} ${unit}, ${percent} percent`}
    >
      <View className="flex-row items-baseline justify-between">
        <Text size="sm" className="font-medium">
          {formatGoalPeriod(goal)} · {goal.type === 'books' ? 'Books' : 'Pages'}
        </Text>
        <Text size="xs" className="text-muted-foreground">
          {achieved}/{goal.target} {unit} · {percent}%
        </Text>
      </View>
      <View className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <View
          className="h-full rounded-full bg-green-500"
          style={{ width: `${percent}%` }}
        />
      </View>
    </Pressable>
  );
}

function DashboardSection({
  title,
  count,
  emptyMessage,
  children,
  moreCount,
}: {
  title: string;
  count: number;
  emptyMessage: string;
  children: React.ReactNode;
  moreCount?: number;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <Heading size="md">{title}</Heading>
        <Text size="xs" className="text-muted-foreground">
          {count}
        </Text>
      </View>
      {count === 0 ? (
        <Card className="w-full p-4">
          <Text size="sm" className="text-muted-foreground">
            {emptyMessage}
          </Text>
        </Card>
      ) : (
        <>
          {children}
          {moreCount != null && moreCount > 0 ? (
            <Text size="xs" className="text-center text-muted-foreground">
              +{moreCount} more in the library below
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

// ─── Empty State (library list) ───────────────────────────────────────────────

function EmptyState({
  hasQuery,
  hasFilter,
  hasAnyBooks,
}: {
  hasQuery: boolean;
  hasFilter: boolean;
  hasAnyBooks: boolean;
}) {
  let icon = '📚';
  let title = 'No books yet';
  let message = 'Tap + to add your first book';

  if (!hasAnyBooks) {
    // defaults above
  } else if (hasQuery) {
    icon = '🔍';
    title = 'No matches';
    message = 'No books match your search';
  } else if (hasFilter) {
    icon = '📖';
    title = 'Nothing here';
    message = 'No books with this status';
  } else {
    title = 'No books';
    message = 'Your library is empty';
  }

  return (
    <View className="items-center px-6 py-12">
      <Text size="3xl">{icon}</Text>
      <Heading size="md" className="mt-3 text-center">
        {title}
      </Heading>
      <Text size="sm" className="mt-1 text-center text-muted-foreground">
        {message}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SECTION_LIMIT = 3;

export default function BooksScreen() {
  const router = useRouter();
  const { books, loading, refreshing, error, refresh } = useBooks();
  const { goals } = useBookGoals();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<LibrarySort>('recently_added');

  const goToBook = (id: string) => router.push(`/books/${id}` as any);
  const goToGoals = () => router.push('/books/goals' as any);
  const today = new Date().toISOString().slice(0, 10);
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);

  // Search + status filter + sort compose in a single pass.
  const visible = useMemo(() => {
    const compare = compareBooks(sort);
    return books
      .filter(
        (b) => (status === 'all' || b.status === status) && matchesQuery(b, query),
      )
      .sort(compare);
  }, [books, query, status, sort]);

  // Dashboard sections use fixed orders and ignore search/filter/sort.
  // They render only in dashboard mode (no query, All filter).
  const dashboardMode = query.trim() === '' && status === 'all';

  const readingBooks = useMemo(
    () =>
      books
        .filter((b) => b.status === 'reading')
        .sort(
          (a, b) => b.updatedAt.localeCompare(a.updatedAt),
        ),
    [books],
  );

  const wantBooks = useMemo(
    () =>
      books
        .filter((b) => b.status === 'want_to_read')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [books],
  );

  const completedBooks = useMemo(
    () =>
      books
        .filter((b) => b.status === 'completed')
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    [books],
  );

  // Compact goals preview: active windows first (max 2), otherwise the
  // latest goal so history stays one tap away. Dashboard mode only.
  const goalPreview = useMemo(() => {
    const active = goals.filter((g) => isGoalActive(g, today));
    const list = active.length > 0 ? active.slice(0, 2) : goals.slice(0, 1);
    return list.map((goal) => ({ goal, ...getGoalProgress(goal, books) }));
  }, [goals, books, today]);

  // Overview counts + pages read (sums currentPage only where a total is
  // known — unknown totals never contribute fake percentages or pages).
  const overview = useMemo(() => {
    let pagesRead = 0;
    for (const b of books) {
      if (
        b.totalPages != null &&
        Number.isFinite(b.currentPage) &&
        b.currentPage > 0
      ) {
        pagesRead += Math.max(0, Math.floor(b.currentPage));
      }
    }
    return {
      reading: readingBooks.length,
      waiting: wantBooks.length,
      completed: completedBooks.length,
      pagesRead,
    };
  }, [books, readingBooks.length, wantBooks.length, completedBooks.length]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading books...
        </Text>
      </View>
    );
  }

  if (error && books.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <AlertTriangle size={32} className="text-destructive" />
        <Heading size="md" className="mt-3 text-center">
          Failed to load books
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          {error}
        </Text>
        <Button
          onPress={() => void refresh()}
          variant="outline"
          className="mt-4 min-h-[44px]"
        >
          <ButtonText>Retry</ButtonText>
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
      }
    >
      <View className="gap-4 px-5 pb-12" style={{ paddingTop: topPadding }}>
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Growth · Library
            </Text>
            <Heading size="xl" className="mt-1">
              Books
            </Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">
              {overview.reading} currently reading · {books.length} total
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/books/analytics' as any)}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted px-3"
            accessibilityRole="button"
            accessibilityLabel="Open reading analytics"
          >
            <TrendingUp size={18} className="text-muted-foreground" />
          </Pressable>
        </View>

        {/* Reading Overview */}
        {books.length > 0 ? (
          <Card className="w-full p-4">
            <Text size="sm" className="mb-3 font-medium text-muted-foreground">
              Reading Overview
            </Text>
            <View className="flex-row gap-2">
              <OverviewTile value={`${overview.reading}`} label="Reading" />
              <OverviewTile value={`${overview.waiting}`} label="To Read" />
            </View>
            <View className="mt-2 flex-row gap-2">
              <OverviewTile value={`${overview.completed}`} label="Completed" />
              <OverviewTile value={`${overview.pagesRead}`} label="Pages Read" />
            </View>
          </Card>
        ) : null}

        {/* Dashboard sections (dashboard mode only) */}
        {dashboardMode ? (
          <>
            <Card className="w-full p-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text size="sm" className="font-medium text-muted-foreground">
                  Reading Goals
                </Text>
                <Pressable
                  onPress={goToGoals}
                  className="min-h-[44px] justify-center px-2"
                  accessibilityRole="button"
                  accessibilityLabel="View all reading goals"
                >
                  <Text size="xs" className="font-medium text-primary">
                    View all
                  </Text>
                </Pressable>
              </View>
              {goalPreview.length === 0 ? (
                <Pressable
                  onPress={goToGoals}
                  className="min-h-[44px] justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Set your first reading goal"
                >
                  <Text size="sm" className="text-muted-foreground">
                    No goals yet. Set a monthly or yearly target →
                  </Text>
                </Pressable>
              ) : (
                <View className="gap-3">
                  {goalPreview.map(({ goal, achieved, percent }) => (
                    <GoalMiniRow
                      key={goal.id}
                      goal={goal}
                      achieved={achieved}
                      percent={percent}
                      onPress={goToGoals}
                    />
                  ))}
                </View>
              )}
            </Card>

            <DashboardSection
              title="Continue Reading"
              count={readingBooks.length}
              emptyMessage="Nothing in progress. Start a book from Want to Read."
              moreCount={readingBooks.length - SECTION_LIMIT}
            >
              <View className="gap-3">
                {readingBooks.slice(0, SECTION_LIMIT).map((book) => (
                  <ContinueRow key={book.id} book={book} onContinue={goToBook} />
                ))}
              </View>
            </DashboardSection>

            <DashboardSection
              title="Want to Read"
              count={wantBooks.length}
              emptyMessage="Your reading queue is empty. Tap + to add a book."
              moreCount={wantBooks.length - SECTION_LIMIT}
            >
              <View className="gap-3">
                {wantBooks.slice(0, SECTION_LIMIT).map((book) => (
                  <BookCard key={book.id} book={book} onPress={goToBook} />
                ))}
              </View>
            </DashboardSection>

            <DashboardSection
              title="Recently Completed"
              count={completedBooks.length}
              emptyMessage="No finished books yet. Completed books will appear here."
              moreCount={completedBooks.length - SECTION_LIMIT}
            >
              <View className="gap-3">
                {completedBooks.slice(0, SECTION_LIMIT).map((book) => (
                  <BookCard key={book.id} book={book} onPress={goToBook} />
                ))}
              </View>
            </DashboardSection>
          </>
        ) : null}

        {/* Search */}
        <Input className="bg-card">
          <InputSlot>
            <Search size={16} className="ml-3 text-muted-foreground" />
          </InputSlot>
          <InputField
            placeholder="Search title or author..."
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            accessibilityLabel="Search books by title or author"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              className="min-h-[44px] min-w-[44px] items-center justify-center px-3"
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <X size={16} className="text-muted-foreground" />
            </Pressable>
          )}
        </Input>

        {/* Status filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {STATUS_FILTERS.map((f) => {
            const active = status === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setStatus(f.key)}
                className={`min-h-[44px] justify-center rounded-lg px-4 py-2 ${
                  active ? 'bg-primary' : 'bg-muted'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter by ${f.label}`}
              >
                <Text
                  size="sm"
                  className={`font-medium ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Sort options */}
        <View>
          <Text size="xs" className="mb-2 font-medium text-muted-foreground">
            Sort by
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {SORT_OPTIONS.map((o) => {
              const active = sort === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => setSort(o.key)}
                  className={`min-h-[44px] justify-center rounded-lg px-4 py-2 ${
                    active ? 'bg-primary' : 'bg-muted'
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Sort by ${o.label}`}
                >
                  <Text
                    size="sm"
                    className={`font-medium ${
                      active ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Error banner (non-fatal) */}
        {error ? (
          <Card className="w-full border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
            <View className="flex-row items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />
              <Text size="xs" className="flex-1 text-red-600 dark:text-red-400">
                {error}
              </Text>
              <Pressable onPress={() => void refresh()}>
                <Text
                  size="xs"
                  className="font-medium text-red-600 dark:text-red-400"
                >
                  Retry
                </Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        {/* Full library */}
        {dashboardMode ? (
          <Heading size="md">Library</Heading>
        ) : null}
        {visible.length === 0 ? (
          <EmptyState
            hasQuery={query.trim().length > 0}
            hasFilter={status !== 'all'}
            hasAnyBooks={books.length > 0}
          />
        ) : (
          <View className="gap-3">
            {visible.map((book) => (
              <BookCard key={book.id} book={book} onPress={goToBook} />
            ))}
          </View>
        )}
      </View>

      {/* Add Book */}
      <View className="absolute bottom-6 right-5">
        <Pressable
          onPress={() => router.push('/books/new' as any)}
          className="h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
          accessibilityRole="button"
          accessibilityLabel="Add Book"
        >
          <Plus size={24} className="text-primary-foreground" />
        </Pressable>
      </View>
    </ScrollView>
  );
}
