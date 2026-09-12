// ─── Books Hook (Phase 1A) ────────────────────────────────────────────────────
// Mirrors the Tasks hook: requestId/stale-response protection, immutable state
// updates, errors rethrown for screens to surface. Local/offline only.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Book, CreateBookInput, UpdateBookInput } from '@/types/books';
import {
  getBooks,
  createBook,
  updateBook,
  deleteBook,
} from '@/services/books';

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busyRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadBooks = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const booksData = await getBooks();

      if (requestId !== requestIdRef.current) return;

      setBooks(booksData);
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load books');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadBooks();
  }, [loadBooks]);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    await loadBooks();
    busyRef.current = false;
  }, [loadBooks]);

  const addBook = useCallback(async (input: CreateBookInput): Promise<Book> => {
    const requestId = ++requestIdRef.current;
    const newBook = await createBook(input);
    // Skip the local patch only when a newer request already superseded us.
    if (requestId === requestIdRef.current) {
      setBooks((prev) => [newBook, ...prev]);
    }
    return newBook;
  }, []);

  const editBook = useCallback(async (id: string, input: UpdateBookInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateBook(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Book not found');
      setBooks((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeBook = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await deleteBook(id);
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setBooks((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  return {
    books,
    loading,
    refreshing,
    error,
    refresh,
    addBook,
    editBook,
    removeBook,
  };
}
