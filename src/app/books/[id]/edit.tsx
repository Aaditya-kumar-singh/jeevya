import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useBooks } from '@/hooks/useBooks';
import {
  BOOK_STATUS_LABELS,
  BOOK_STATUSES,
  type BookStatus,
} from '@/types/books';

function parseOptionalInt(raw: string): number | null | undefined {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d+$/.test(t)) return undefined;
  return parseInt(t, 10);
}

function parseOptionalRating(raw: string): number | null | undefined {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  return parseFloat(t);
}

/** Live progress preview from raw form strings — null when no valid target. */
function previewProgress(currentRaw: string, totalRaw: string): number | null {
  const current = parseOptionalInt(currentRaw);
  const total = parseOptionalInt(totalRaw);
  if (current == null || total == null || total <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
}

export default function EditBookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { books, loading, editBook } = useBooks();
  const book = books.find((b) => b.id === id);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<BookStatus>('want_to_read');
  const [totalPages, setTotalPages] = useState('');
  const [currentPage, setCurrentPage] = useState('');
  const [rating, setRating] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    totalPages?: string;
    currentPage?: string;
    rating?: string;
  }>({});

  // Prefill from the stored book (service stays the source of truth).
  useEffect(() => {
    if (book) {
      setTitle(book.title);
      setAuthor(book.author);
      setStatus(book.status);
      setTotalPages(book.totalPages != null ? String(book.totalPages) : '');
      setCurrentPage(String(book.currentPage));
      setRating(book.rating != null ? String(book.rating) : '');
      setCoverUrl(book.coverUrl);
      setIsbn(book.isbn);
      setCategory(book.category);
      setDescription(book.description);
      setNotes(book.notes);
    }
  }, [book?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Same rules as the books service: title required, pages non-negative,
  // current <= total, rating 0–5. The service re-validates on save.
  const validate = useCallback((): {
    ok: boolean;
    total: number | null;
    current: number;
    rate: number | null;
  } => {
    const next: typeof errors = {};

    if (!title.trim()) {
      next.title = 'Title is required';
    } else if (title.trim().length > 200) {
      next.title = 'Title is too long (max 200 characters)';
    }

    const total = parseOptionalInt(totalPages);
    if (total === undefined) next.totalPages = 'Enter a whole number (0 or more)';
    const currentRaw = parseOptionalInt(currentPage);
    if (currentRaw === undefined) next.currentPage = 'Enter a whole number (0 or more)';
    const rate = parseOptionalRating(rating);
    if (rate === undefined || (rate != null && (rate < 0 || rate > 5))) {
      next.rating = 'Enter a number from 0 to 5';
    }

    const current = currentRaw ?? 0;
    if (total != null && currentRaw != null && currentRaw > total) {
      next.currentPage = 'Current page cannot exceed total pages';
    }

    setErrors(next);
    return {
      ok: Object.keys(next).length === 0,
      total: total ?? null,
      current,
      rate: rate ?? null,
    };
  }, [title, totalPages, currentPage, rating]);

  const handleSave = useCallback(async () => {
    if (!book) return;
    const parsed = validate();
    if (!parsed.ok) return;

    setSaving(true);
    try {
      await editBook(book.id, {
        title: title.trim(),
        author: author.trim(),
        status,
        totalPages: parsed.total,
        currentPage: parsed.current,
        rating: parsed.rate,
        coverUrl: coverUrl.trim(),
        isbn: isbn.trim(),
        category: category.trim(),
        description: description.trim(),
        notes: notes.trim(),
      });
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save book');
    } finally {
      setSaving(false);
    }
  }, [
    book,
    title,
    author,
    status,
    coverUrl,
    isbn,
    category,
    description,
    notes,
    validate,
    editBook,
    router,
  ]);

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
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Heading size="md" className="text-center">
          Book not found
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          {`No book matches id "${id}". It may have been deleted.`}
        </Text>
        <Button
          variant="outline"
          className="mt-4 min-h-[44px]"
          onPress={() => router.replace('/books' as any)}
        >
          <ButtonText>Back to Library</ButtonText>
        </Button>
      </View>
    );
  }

  const liveProgress = previewProgress(currentPage, totalPages);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center gap-3 px-5 pt-14">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Books
            </Text>
            <Heading size="xl" className="mt-1">
              Edit Book
            </Heading>
          </View>
        </View>

        <View className="gap-4 px-5 pt-6">
          {/* Title */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Title <Text className="text-destructive">*</Text>
            </Text>
            <Input>
              <InputField
                placeholder="Book title"
                value={title}
                onChangeText={(text: string) => {
                  setTitle(text);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                returnKeyType="next"
              />
            </Input>
            {errors.title ? (
              <Text size="xs" className="mt-1 text-destructive">
                {errors.title}
              </Text>
            ) : null}
          </Card>

          {/* Author */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Author
            </Text>
            <Input>
              <InputField
                placeholder="Author name"
                value={author}
                onChangeText={setAuthor}
                returnKeyType="next"
              />
            </Input>
          </Card>

          {/* Status */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-3 font-medium">
              Status
            </Text>
            <View className="flex-row gap-2">
              {BOOK_STATUSES.map((s) => {
                const selected = status === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    className={`min-h-[44px] flex-1 items-center justify-center rounded-xl px-2 py-3 ${
                      selected
                        ? 'border-2 border-primary bg-accent'
                        : 'border-2 border-border bg-card'
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Status ${BOOK_STATUS_LABELS[s]}`}
                  >
                    <Text
                      size="sm"
                      className={`font-medium ${
                        selected ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {BOOK_STATUS_LABELS[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text size="xs" className="mt-2 text-muted-foreground">
              Marking as Reading sets Started when empty; Completed sets Finished now.
            </Text>
          </Card>

          {/* Pages + live progress */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Pages
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input>
                  <InputField
                    placeholder="Current (empty = 0)"
                    value={currentPage}
                    onChangeText={(text: string) => {
                      setCurrentPage(text);
                      if (errors.currentPage) {
                        setErrors((prev) => ({ ...prev, currentPage: undefined }));
                      }
                    }}
                    keyboardType="number-pad"
                    accessibilityLabel="Current page"
                  />
                </Input>
              </View>
              <View className="flex-1">
                <Input>
                  <InputField
                    placeholder="Total (empty = unknown)"
                    value={totalPages}
                    onChangeText={(text: string) => {
                      setTotalPages(text);
                      if (errors.totalPages) {
                        setErrors((prev) => ({ ...prev, totalPages: undefined }));
                      }
                    }}
                    keyboardType="number-pad"
                    accessibilityLabel="Total pages, empty for unknown"
                  />
                </Input>
              </View>
            </View>
            {errors.currentPage ? (
              <Text size="xs" className="mt-1 text-destructive">
                {errors.currentPage}
              </Text>
            ) : null}
            {errors.totalPages ? (
              <Text size="xs" className="mt-1 text-destructive">
                {errors.totalPages}
              </Text>
            ) : null}
            {liveProgress != null ? (
              <View>
                <Progress value={liveProgress} className="mt-3">
                  <ProgressFilledTrack />
                </Progress>
                <Text
                  size="xs"
                  className="mt-1 text-muted-foreground"
                  accessibilityLabel={`Progress preview: ${liveProgress} percent`}
                >
                  {liveProgress}% finished
                </Text>
              </View>
            ) : (
              <Text size="xs" className="mt-2 text-muted-foreground">
                Enter a total to track progress.
              </Text>
            )}
          </Card>

          {/* Rating + Category + ISBN */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Rating (0–5, optional)
            </Text>
            <Input>
              <InputField
                placeholder="Empty = unrated"
                value={rating}
                onChangeText={(text: string) => {
                  setRating(text);
                  if (errors.rating) setErrors((prev) => ({ ...prev, rating: undefined }));
                }}
                keyboardType="decimal-pad"
                accessibilityLabel="Rating from 0 to 5"
              />
            </Input>
            {errors.rating ? (
              <Text size="xs" className="mt-1 text-destructive">
                {errors.rating}
              </Text>
            ) : null}
            <Text size="sm" className="mb-2 mt-4 font-medium">
              Category (optional)
            </Text>
            <Input>
              <InputField
                placeholder="Design, Fiction, ..."
                value={category}
                onChangeText={setCategory}
              />
            </Input>
            <Text size="sm" className="mb-2 mt-4 font-medium">
              ISBN (optional)
            </Text>
            <Input>
              <InputField
                placeholder="978-..."
                value={isbn}
                onChangeText={setIsbn}
                autoCapitalize="none"
              />
            </Input>
          </Card>

          {/* Cover + Description + Notes */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Cover URL (optional)
            </Text>
            <Input>
              <InputField
                placeholder="https://..."
                value={coverUrl}
                onChangeText={setCoverUrl}
                keyboardType="url"
                autoCapitalize="none"
              />
            </Input>
            <Text size="sm" className="mb-2 mt-4 font-medium">
              Description (optional)
            </Text>
            <Input className="min-h-[80px]">
              <InputField
                placeholder="What is this book about?"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: 80 }}
              />
            </Input>
            <Text size="sm" className="mb-2 mt-4 font-medium">
              Notes (optional)
            </Text>
            <Input className="min-h-[80px]">
              <InputField
                placeholder="Personal notes, quotes, takeaways..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: 80 }}
              />
            </Input>
          </Card>

          {/* Actions */}
          <View className="flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="min-h-[44px] flex-1"
              onPress={() => router.back()}
              disabled={saving}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button
              variant="default"
              className="min-h-[44px] flex-1"
              onPress={() => void handleSave()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" className="text-primary-foreground" />
              ) : (
                <>
                  <Save size={16} className="text-primary-foreground" />
                  <ButtonText>Save</ButtonText>
                </>
              )}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
