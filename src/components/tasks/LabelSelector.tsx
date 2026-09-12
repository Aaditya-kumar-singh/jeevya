// ─── Label UI (Phase 1G-B) ─────────────────────────────────────────────────────
// Shared, controlled label components for the create/edit task screens and the
// task list. Theme-aware (semantic tokens only) and accessible. Parents own
// all state and persistence — this file never touches storage.

import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { getTaskLabels } from '@/lib/task-labels';
import type { Label, Task } from '@/types/tasks';

// ─── Read-only chips ──────────────────────────────────────────────────────────

/** Compact label chips for task rows. Shows up to `max`, then "+n". */
export function LabelChips({
  task,
  labels,
  max = 3,
}: {
  task: Task;
  labels: Label[];
  max?: number;
}) {
  const resolved = getTaskLabels(task, labels);
  if (resolved.length === 0) return null;
  const shown = resolved.slice(0, max);
  const extra = resolved.length - shown.length;

  return (
    <>
      {shown.map((label) => (
        <View
          key={label.id}
          className="flex-row items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5"
        >
          <Tag size={10} className="text-muted-foreground" />
          <Text size="xs" className="text-muted-foreground">
            {label.name}
          </Text>
        </View>
      ))}
      {extra > 0 && (
        <View className="rounded-sm bg-muted px-1.5 py-0.5">
          <Text size="xs" className="text-muted-foreground">
            +{extra}
          </Text>
        </View>
      )}
    </>
  );
}

// ─── Multi-select chips + inline create ───────────────────────────────────────

/**
 * Controlled multi-select: toggle chips for every known label plus an inline
 * "new label" field. `onCreate` must persist and return the label (the
 * service returns the existing entity on normalized-name duplicates, which is
 * then selected instead of duplicating).
 */
export function LabelSelector({
  labels,
  selectedIds,
  onChange,
  onCreate,
  disabled = false,
}: {
  labels: Label[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  onCreate: (name: string) => Promise<Label>;
  disabled?: boolean;
}) {
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = new Set(selectedIds);

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      selected.has(id) ? selectedIds.filter((lid) => lid !== id) : [...selectedIds, id],
    );
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || saving || disabled) return;
    setSaving(true);
    setError(null);
    try {
      const created = await onCreate(name);
      setNewName('');
      if (!selected.has(created.id)) onChange([...selectedIds, created.id]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create label');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-3">
      {labels.length === 0 ? (
        <Text size="sm" className="text-muted-foreground">
          No labels yet — create the first one below.
        </Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {labels.map((label) => {
            const active = selected.has(label.id);
            return (
              <Pressable
                key={label.id}
                onPress={() => toggle(label.id)}
                disabled={disabled}
                className={`min-h-[36px] flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${
                  active ? 'bg-primary' : 'bg-muted'
                }`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`Label ${label.name}`}
              >
                <Tag
                  size={12}
                  className={active ? 'text-primary-foreground' : 'text-muted-foreground'}
                />
                <Text
                  size="sm"
                  className={`font-medium ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {label.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View className="flex-row gap-2">
        <View className="flex-1">
          <Input>
            <InputField
              placeholder="New label..."
              value={newName}
              onChangeText={(text: string) => {
                setNewName(text);
                if (error) setError(null);
              }}
              onSubmitEditing={() => void handleCreate()}
              returnKeyType="done"
              maxLength={30}
              editable={!disabled}
              accessibilityLabel="New label name"
            />
          </Input>
        </View>
        <Button
          variant="outline"
          onPress={() => void handleCreate()}
          disabled={disabled || saving || newName.trim().length === 0}
        >
          <Plus size={16} />
          <ButtonText>Add</ButtonText>
        </Button>
      </View>
      {error && (
        <Text size="xs" className="text-destructive">
          {error}
        </Text>
      )}
    </View>
  );
}

// ─── Label management (rename / delete entities) ─────────────────────────────

/** Manage the shared label entities themselves (used in task detail). */
export function LabelManager({
  labels,
  onRename,
  onDelete,
  disabled = false,
}: {
  labels: Label[];
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update label');
    } finally {
      setSaving(false);
    }
  };

  const handleRename = () =>
    run(async () => {
      if (!editingId) return;
      await onRename(editingId, editingName.trim());
      setEditingId(null);
      setEditingName('');
    });

  const handleDelete = (label: Label) => {
    Alert.alert(
      'Delete Label',
      `Remove "${label.name}" from all tasks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void run(() => onDelete(label.id)),
        },
      ],
    );
  };

  if (labels.length === 0) {
    return (
      <Text size="sm" className="text-muted-foreground">
        No labels to manage.
      </Text>
    );
  }

  return (
    <View className="gap-2">
      {labels.map((label) => (
        <View
          key={label.id}
          className="min-h-[56px] flex-row items-center gap-2 rounded-xl bg-muted px-3 py-2"
        >
          {editingId === label.id ? (
            <View className="flex-1 flex-row items-center gap-1">
              <View className="flex-1">
                <Input className="bg-card">
                  <InputField
                    value={editingName}
                    onChangeText={setEditingName}
                    onSubmitEditing={() => void handleRename()}
                    returnKeyType="done"
                    autoFocus
                    maxLength={30}
                    accessibilityLabel={`Rename label ${label.name}`}
                  />
                </Input>
              </View>
              <Pressable
                onPress={() => void handleRename()}
                disabled={saving || editingName.trim().length === 0}
                className="min-h-[44px] min-w-[44px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={`Save label ${label.name}`}
              >
                <Check size={18} className="text-green-500" />
              </Pressable>
              <Pressable
                onPress={() => {
                  setEditingId(null);
                  setEditingName('');
                }}
                className="min-h-[44px] min-w-[44px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Cancel renaming label"
              >
                <X size={18} className="text-muted-foreground" />
              </Pressable>
            </View>
          ) : (
            <>
              <Tag size={14} className="text-muted-foreground" />
              <Text size="sm" className="flex-1 font-medium">
                {label.name}
              </Text>
              <Pressable
                onPress={() => {
                  setEditingId(label.id);
                  setEditingName(label.name);
                  setError(null);
                }}
                disabled={disabled}
                className="min-h-[44px] min-w-[44px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={`Rename label ${label.name}`}
              >
                <Pencil size={16} className="text-muted-foreground" />
              </Pressable>
              <Pressable
                onPress={() => handleDelete(label)}
                disabled={disabled}
                className="min-h-[44px] min-w-[44px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={`Delete label ${label.name}`}
              >
                <Trash2 size={16} className="text-destructive" />
              </Pressable>
            </>
          )}
        </View>
      ))}
      {error && (
        <Text size="xs" className="text-destructive">
          {error}
        </Text>
      )}
    </View>
  );
}
