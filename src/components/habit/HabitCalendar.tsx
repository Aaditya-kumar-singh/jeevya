import { View } from 'react-native';
import { Text, Heading } from '@/components/ui';
import { Card } from '@/components/ui/card';
import type { MonthlyHistory } from '@/services/habitStats';

interface HabitCalendarProps {
  history: MonthlyHistory;
  onDayPress?: (date: string) => void;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function HabitCalendar({ history, onDayPress }: HabitCalendarProps) {
  const { year, month, days } = history;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  // Convert to Monday-based (1 = Monday, 7 = Sunday)
  const adjustedStart = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  // Get number of days in month
  const daysInMonth = days.length;

  return (
    <Card className="p-4">
      <Heading size="md" className="mb-3">
        {monthNames[month]} {year}
      </Heading>

      {/* Weekday headers */}
      <View className="flex-row gap-1 mb-2">
        {WEEKDAYS.map((day, index) => (
          <View
            key={index}
            className="flex-1 text-center"
          >
            <Text size="xs" className="text-muted-foreground font-medium">
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View className="flex-row flex-wrap gap-1">
        {/* Empty cells for days before the 1st */}
        {Array.from({ length: adjustedStart }).map((_, index) => (
          <View key={`empty-${index}`} className="aspect-square rounded-full" />
        ))}

        {/* Day cells */}
        {days.map((day, index) => {
          const date = new Date(day.date);
          const dayNumber = date.getDate();
          const isToday =
            date.getFullYear() === new Date().getFullYear() &&
            date.getMonth() === new Date().getMonth() &&
            date.getDate() === new Date().getDate();

          let backgroundColor = 'bg-muted/20';
          let textColor = 'text-muted-foreground';
          let accessibilityState = {};

          if (day.scheduled && day.completed) {
            backgroundColor = 'bg-success/20';
            textColor = 'text-success';
            accessibilityState = { checked: true };
          } else if (day.scheduled && !day.completed) {
            backgroundColor = 'bg-destructive/10';
            textColor = 'text-destructive';
            accessibilityState = { checked: false };
          } else {
            // Not scheduled
            backgroundColor = 'bg-muted/10';
            textColor = 'text-muted-foreground/50';
          }

          if (isToday) {
            backgroundColor = backgroundColor.replace('bg-', 'bg-').replace('/20', '');
            // Add ring for today
          }

          return (
            <View
              key={day.date}
              className={`aspect-square rounded-full flex-row items-center justify-center text-xs font-medium ${backgroundColor} ${textColor} ${isToday ? 'ring-2 ring-ring' : ''}`}
              onTouchEnd={() => onDayPress?.(day.date)}
              accessibilityLabel={`${monthNames[month]} ${dayNumber}, ${day.completed ? 'Completed' : day.scheduled ? 'Missed' : 'Not scheduled'}`}
              accessibilityState={accessibilityState}
            >
              <Text size="sm">{dayNumber}</Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View className="mt-4 flex-row gap-4">
        <View className="flex-row items-center gap-1.5">
          <View className="h-3 w-3 rounded-full bg-success/30 border border-success/50" />
          <Text size="xs" className="text-muted-foreground">Completed</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-3 w-3 rounded-full bg-destructive/20 border border-destructive/50" />
          <Text size="xs" className="text-muted-foreground">Missed</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-3 w-3 rounded-full bg-muted/30" />
          <Text size="xs" className="text-muted-foreground">Not scheduled</Text>
        </View>
      </View>

      {/* Stats */}
      <View className="mt-4 flex-row items-center justify-between pt-3 border-t border-border">
        <Text size="xs" className="text-muted-foreground">
          {history.completedCount} of {history.scheduledCount} scheduled days
        </Text>
        <Text size="sm" className="font-medium">
          {history.percentage}%
        </Text>
      </View>
    </Card>
  );
}

export default HabitCalendar;
