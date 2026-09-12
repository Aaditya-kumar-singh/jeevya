import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
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
  // Returns undefined when unparseable so the caller can flag the field.
  if (!/^\d+$/.test(t)) return undefined;
  return parseInt(t, 10);
}

function parseOptionalRating(raw: string): number | null | undefined {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  return parseFloat(t);
}

export default function NewBookScreen() {
  const router = useRouter();
  const { addBook } = useBooks();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<BookStatus>('want_to_read');
  const [totalPages, setTotalPages] = useState('');
  const [currentPage, setCurrentPage] = useState('');
  const [rating, setRating] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    totalPages?: string;
    currentPage?: string;
    rating?: string;
  }>({});

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
    if (
      total != null &&
      currentRaw != null &&
      currentRaw > total
    ) {
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
    const parsed = validate();
    if (!parsed.ok) return;

    setSaving(true);
    try {
      await addBook({
        title: title.trim(),
        author: author.trim(),
        status,
        totalPages: parsed.total,
        currentPage: parsed.current,
        rating: parsed.rate,
        coverUrl: coverUrl.trim(),
        category: category.trim(),
        description: description.trim(),
      });
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create book');
    } finally {
      setSaving(false);
    }
  }, [
    title,
    author,
    status,
    coverUrl,
    category,
    description,
    validate,
    addBook,
    router,
  ]);

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
              New Book
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
                placeholder="The Design of Everyday Things"
                value={title}
                onChangeText={(text: string) => {
                  setTitle(text);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                returnKeyType="next"
                autoFocus
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
                placeholder="Don Norman"
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
          </Card>

          {/* Pages */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Pages
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input>
                  <InputField
                    placeholder="Current"
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
                    placeholder="Total"
                    value={totalPages}
                    onChangeText={(text: string) => {
                      setTotalPages(text);
                      if (errors.totalPages) {
                        setErrors((prev) => ({ ...prev, totalPages: undefined }));
                      }
                    }}
                    keyboardType="number-pad"
                    accessibilityLabel="Total pages"
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
          </Card>

          {/* Rating + Category */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Rating (0–5, optional)
            </Text>
            <Input>
              <InputField
                placeholder="4.5"
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
          </Card>

          {/* Cover + Description */}
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
                  <ButtonText>Save Book</ButtonText>
                </>
              )}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
