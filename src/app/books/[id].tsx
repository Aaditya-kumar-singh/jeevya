import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Minus,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
} from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useBooks } from '@/hooks/useBooks';
import { useBookProgress } from '@/hooks/useBookProgress';
import {
  BOOK_STATUS_LABELS,
  bookProgressPercent,
  type Book,
} from '@/types/books';

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatHistoryDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-3">
      <Text size="xs" className="shrink-0 text-muted-foreground">
        {label}
      </Text>
      <Text size="xs" className="flex-1 text-right">
        {value}
      </Text>
    </View>
  );
}

// ─── Reading Progress Controls (Phase 1D) ─────────────────────────────────────

function ProgressControls({
  book,
  saving,
  onSave,
  onContinue,
  onComplete,
}: {
  book: Book;
  saving: boolean;
  onSave: (page: number) => Promise<boolean>;
  onContinue: () => void;
  onComplete: () => void;
}) {
  const [pageInput, setPageInput] = useState(String(book.currentPage));
  const [pageError, setPageError] = useState<string | null>(null);

  // Resync when navigating between books or when the stored page changes
  // elsewhere (e.g. the edit screen). Typing never touches book.currentPage,
  // so in-progress input is never clobbered.
  useEffect(() => {
    setPageInput(String(book.currentPage));
    setPageError(null);
  }, [book.id, book.currentPage]);  

  const maxPage = book.totalPages;
  const clamp = (n: number) =>
    Math.max(0, maxPage != null ? Math.min(n, maxPage) : n);

  const step = (delta: number) => {
    setPageError(null);
    const base = /^\d+$/.test(pageInput.trim())
      ? parseInt(pageInput.trim(), 10)
      : book.currentPage;
    setPageInput(String(clamp(base + delta)));
  };

  const handleSave = async () => {
    const trimmed = pageInput.trim();
    if (!/^\d+$/.test(trimmed)) {
      setPageError('Enter a whole page number (0 or more)');
      return;
    }
    const page = parseInt(trimmed, 10);
    if (maxPage != null && page > maxPage) {
      setPageError(`Page cannot exceed ${maxPage}`);
      return;
    }
    setPageError(null);
    const ok = await onSave(page);
    if (!ok) setPageError('Failed to save progress');
  };

  const progress = bookProgressPercent(book);
  const remaining = maxPage != null ? Math.max(0, maxPage - book.currentPage) : null;

  return (
    <Card className="w-full p-4">
      <Text size="sm" className="mb-2 font-medium">
        Reading Progress
      </Text>
      <Text
        size="sm"
        className="text-muted-foreground"
        accessibilityLabel={
          progress != null
            ? `Page ${book.currentPage} of ${maxPage}, ${progress} percent, ${remaining} pages remaining`
            : `On page ${book.currentPage}, no page target set`
        }
      >
        {maxPage != null
          ? `p. ${book.currentPage}/${maxPage} · ${progress}% · ${remaining} left`
          : `p. ${book.currentPage} · no target`}
      </Text>

      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          onPress={() => step(-1)}
          disabled={saving}
          className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted"
          accessibilityRole="button"
          accessibilityLabel="One page back"
        >
          <Minus size={18} className="text-foreground" />
        </Pressable>
        <View className="flex-1">
          <Input>
            <InputField
              value={pageInput}
              onChangeText={(text: string) => {
                setPageInput(text);
                if (pageError) setPageError(null);
              }}
              onSubmitEditing={() => void handleSave()}
              keyboardType="number-pad"
              returnKeyType="done"
              editable={!saving}
              accessibilityLabel="Current page number"
            />
          </Input>
        </View>
        <Pressable
          onPress={() => step(1)}
          disabled={saving}
          className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted"
          accessibilityRole="button"
          accessibilityLabel="One page forward"
        >
          <Plus size={18} className="text-foreground" />
        </Pressable>
      </View>
      {pageError ? (
        <Text size="xs" className="mt-1 text-destructive">
          {pageError}
        </Text>
      ) : null}

      <Button
        variant="default"
        className="mt-3 min-h-[44px]"
        onPress={() => void handleSave()}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" className="text-primary-foreground" />
        ) : (
          <>
            <Save size={16} className="text-primary-foreground" />
            <ButtonText>Save Progress</ButtonText>
          </>
        )}
      </Button>

      {book.status !== 'completed' ? (
        <View className="mt-2 flex-row gap-2">
          <Button
            variant="outline"
            className="min-h-[44px] flex-1"
            onPress={onContinue}
            disabled={saving}
          >
            <BookOpen size={16} />
            <ButtonText>Continue Reading</ButtonText>
          </Button>
          <Button
            variant="outline"
            className="min-h-[44px] flex-1"
            onPress={onComplete}
            disabled={saving}
          >
            <CheckCircle size={16} className="text-green-500" />
            <ButtonText>Mark Completed</ButtonText>
          </Button>
        </View>
      ) : null}
    </Card>
  );
}

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { books, loading, error, refresh, editBook, removeBook } = useBooks();
  const {
    entries: history,
    logProgress,
    clearHistory,
  } = useBookProgress(typeof id === 'string' ? id : undefined);
  const [coverFailed, setCoverFailed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  const book = books.find((b) => b.id === id);

  const handleSaveProgress = async (page: number): Promise<boolean> => {
    if (!book || savingProgress) return false;
    setSavingProgress(true);
    try {
      // editBook enforces page bounds; history logs the same saved page.
      await editBook(book.id, { currentPage: page });
      await logProgress(page);
      return true;
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save progress');
      return false;
    } finally {
      setSavingProgress(false);
    }
  };

  const handleContinue = () => {
    if (!book || savingProgress) return;
    // Reading → remain Reading (no-op transition); Want to Read → Reading
    // (service stamps startedAt when missing). Completed hides this action.
    if (book.status === 'reading') return;
    setSavingProgress(true);
    void (async () => {
      try {
        await editBook(book.id, { status: 'reading' });
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update status');
      } finally {
        setSavingProgress(false);
      }
    })();
  };

  const handleComplete = () => {
    if (!book || savingProgress) return;
    // Progress is never reset: jump to the final page when known, keep the
    // current page otherwise. Service stamps completedAt.
    const page = book.totalPages ?? book.currentPage;
    setSavingProgress(true);
    void (async () => {
      try {
        await editBook(book.id, { status: 'completed', currentPage: page });
        await logProgress(page);
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to complete book');
      } finally {
        setSavingProgress(false);
      }
    })();
  };

  const handleDelete = () => {
    if (!book || deleting) return;
    Alert.alert(
      'Delete Book',
      `Remove "${book.title}" from your library? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
            onPress: () => {
              setDeleting(true);
              void (async () => {
                try {
                  await removeBook(book.id);
                  // History lives in a separate store — clean it up too.
                  await clearHistory();
                  router.replace('/books' as any);
                } catch (e) {
                  Alert.alert(
                    'Error',
                    e instanceof Error ? e.message : 'Failed to delete book',
                  );
                } finally {
                  setDeleting(false);
                }
              })();
            },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading book...
        </Text>
      </View>
    );
  }

  if (!book) {
    return (
      <ScrollView className="flex-1 bg-background">
        <View className="gap-4 px-5 pb-8 pt-14">
          <Heading size="xl">Book not found</Heading>
          <Text size="sm" className="text-muted-foreground">
            {`No book matches id "${id}". It may have been deleted.`}
          </Text>
          <Button
            variant="outline"
            className="mt-2 min-h-[44px]"
            onPress={() => router.replace('/books' as any)}
          >
            <ButtonText>Back to Library</ButtonText>
          </Button>
        </View>
      </ScrollView>
    );
  }

  const progress = bookProgressPercent(book);
  const showCover = book.coverUrl !== '' && !coverFailed;

  return (
    <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled">
      <View className="gap-4 px-5 pb-8 pt-14">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Growth · Book detail
            </Text>
            <Heading size="xl" className="mt-1">
              {book.title}
            </Heading>
          </View>
          <Pressable
            onPress={() => router.push(`/books/${book.id}/edit` as any)}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted px-3"
            accessibilityRole="button"
            accessibilityLabel={`Edit ${book.title}`}
          >
            <Pencil size={18} className="text-muted-foreground" />
          </Pressable>
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

        {/* Cover + core info */}
        <Card className="w-full p-4">
          <View className="flex-row gap-4">
            {showCover ? (
              <Image
                source={{ uri: book.coverUrl }}
                style={{ width: 110, height: 160, borderRadius: 12 }}
                contentFit="cover"
                onError={() => setCoverFailed(true)}
                accessibilityLabel={`Cover of ${book.title}`}
              />
            ) : (
              <View className="h-40 w-28 items-center justify-center rounded-xl bg-muted">
                <BookOpen size={28} className="text-muted-foreground" />
              </View>
            )}
            <View className="flex-1 justify-center gap-2">
              <Badge
                variant={
                  book.status === 'completed'
                    ? 'default'
                    : book.status === 'reading'
                      ? 'secondary'
                      : 'outline'
                }
              >
                <BadgeText>{BOOK_STATUS_LABELS[book.status]}</BadgeText>
              </Badge>
              <Text size="sm" className="text-muted-foreground">
                {book.author || 'Unknown author'}
              </Text>
              {book.rating != null ? (
                <View
                  className="flex-row items-center gap-1"
                  accessibilityLabel={`Rated ${book.rating} out of 5`}
                >
                  <Star size={14} className="text-amber-500" />
                  <Text size="sm" className="font-medium">
                    {book.rating}/5
                  </Text>
                </View>
              ) : (
                <Text size="sm" className="text-muted-foreground">
                  Not rated
                </Text>
              )}
              <Text
                size="sm"
                className="text-muted-foreground"
                accessibilityLabel={
                  progress != null
                    ? `Page ${book.currentPage} of ${book.totalPages}, ${progress} percent`
                    : 'No page target set'
                }
              >
                {book.totalPages != null
                  ? `p. ${book.currentPage}/${book.totalPages}`
                  : `p. ${book.currentPage} · no target`}
              </Text>
            </View>
          </View>

          {progress != null ? (
            <View>
              <Progress value={progress} className="mt-4">
                <ProgressFilledTrack />
              </Progress>
              <Text size="sm" className="mt-2 text-muted-foreground">
                {progress}% finished
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Reading progress controls */}
        <ProgressControls
          book={book}
          saving={savingProgress}
          onSave={handleSaveProgress}
          onContinue={handleContinue}
          onComplete={handleComplete}
        />

        {/* Recent history */}
        <Card className="w-full p-4">
          <Text size="sm" className="mb-2 font-medium">
            Recent Progress
          </Text>
          {history.length === 0 ? (
            <Text size="sm" className="text-muted-foreground">
              No progress logged yet. Save a page above to start tracking.
            </Text>
          ) : (
            <View className="gap-2">
              {history.slice(0, 5).map((entry) => (
                <View
                  key={entry.id}
                  className="flex-row items-center justify-between rounded-lg bg-muted px-3 py-2"
                >
                  <Text size="sm" className="font-medium">
                    p. {entry.page}
                  </Text>
                  <Text size="xs" className="text-muted-foreground">
                    {formatHistoryDate(entry.recordedAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Description */}
        {book.description ? (
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Description
            </Text>
            <Text size="sm" className="text-muted-foreground">
              {book.description}
            </Text>
          </Card>
        ) : null}

        {/* Details */}
        <Card className="w-full p-4">
          <Text size="sm" className="mb-3 font-medium text-muted-foreground">
            Details
          </Text>
          <View className="gap-2">
            <DetailRow label="Category" value={book.category || '—'} />
            <DetailRow label="ISBN" value={book.isbn || '—'} />
            <DetailRow label="Status" value={BOOK_STATUS_LABELS[book.status]} />
            <DetailRow
              label="Rating"
              value={book.rating != null ? `${book.rating}/5` : '—'}
            />
            <DetailRow
              label="Pages"
              value={
                book.totalPages != null
                  ? `${book.currentPage}/${book.totalPages}`
                  : `${book.currentPage} (no target)`
              }
            />
            <DetailRow label="Started" value={formatDateTime(book.startedAt)} />
            <DetailRow label="Completed" value={formatDateTime(book.completedAt)} />
          </View>
        </Card>

        {/* Notes */}
        {book.notes ? (
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Notes
            </Text>
            <Text size="sm" className="text-muted-foreground">
              {book.notes}
            </Text>
          </Card>
        ) : null}

        {/* Actions */}
        <View className="flex-row gap-3 pt-2">
          <Button
            variant="default"
            className="min-h-[44px] flex-1"
            onPress={() => router.push(`/books/${book.id}/edit` as any)}
          >
            <Pencil size={16} className="text-primary-foreground" />
            <ButtonText>Edit</ButtonText>
          </Button>
          <Button
            variant="destructive"
            className="min-h-[44px] flex-1"
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" className="text-primary-foreground" />
            ) : (
              <>
                <Trash2 size={16} className="text-white" />
                <ButtonText>Delete</ButtonText>
              </>
            )}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
