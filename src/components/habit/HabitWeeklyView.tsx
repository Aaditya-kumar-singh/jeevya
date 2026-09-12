import { View } from 'react-native';
import { Text, Heading } from '@/components/ui';
import { Card } from '@/components/ui/card';
import type { WeeklyProgress } from '@/services/habitStats';
import { WEEKDAY_LABELS, type Weekday } from '@/types/habit';

interface HabitWeeklyViewProps {
  weeklyProgress: WeeklyProgress;
}

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function HabitWeeklyView({ weeklyProgress }: HabitWeeklyViewProps) {
  return (
    <Card className="p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Heading size="md">This Week</Heading>
        <Text size="sm" className="text-muted-foreground">
          Week {weeklyProgress.weekNumber}
        </Text>
      </View>

      {/* Weekdays */}
      <View className="flex-row gap-1 justify-between">
        {weeklyProgress.days.map((day, index) => {
          const weekdayIndex = index % 7;
          const isToday =
            new Date(day.date).getDate() === new Date().getDate() &&
            new Date(day.date).getMonth() === new Date().getMonth() &&
            new Date(day.date).getFullYear() === new Date().getFullYear();

          let backgroundColor = 'bg-muted/20';
          let icon = null;
          let accessibilityState = {};

          if (day.scheduled && day.completed) {
            backgroundColor = 'bg-success/20';
            accessibilityState = { checked: true };
          } else if (day.scheduled && !day.completed) {
            backgroundColor = 'bg-destructive/10';
            accessibilityState = { checked: false };
          } else {
            backgroundColor = 'bg-muted/10';
          }

          return (
            <View
              key={day.date}
              className={`flex-1 flex flex-col items-center gap-1 rounded-lg py-2 ${backgroundColor} ${isToday ? 'ring-1 ring-ring' : ''}`}
              accessibilityLabel={`${WEEKDAYS_SHORT[weekdayIndex]}: ${day.completed ? 'Completed' : day.scheduled ? 'Missed' : 'Not scheduled'}`}
              accessibilityState={accessibilityState}
            >
              <Text size="xs" className="text-muted-foreground">
                {WEEKDAYS_SHORT[weekdayIndex]}
              </Text>
              {day.scheduled && (
                day.completed ? (
                  <View
                    className="h-6 w-6 rounded-full bg-success/30 flex-row items-center justify-center"
                    style={{ width: 28, height: 28 }}
                  >
                    <Text size="sm" className="text-success">✓</Text>
                  </View>
                ) : (
                  <View
                    className="h-6 w-6 rounded-full border-2 border-destructive/50"
                    style={{ width: 28, height: 28 }}
                  />
                )
              )}
              {!day.scheduled && (
                <View
                  className="h-6 w-6 rounded-full bg-muted/20"
                  style={{ width: 28, height: 28 }}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Progress summary */}
      <View className="mt-4 pt-3 border-t border-border">
        <View className="flex-row items-center justify-between">
          <Text size="sm" className="text-muted-foreground">
            {weeklyProgress.completedCount} / {weeklyProgress.scheduledCount} scheduled
          </Text>
          <Text size="sm" className="font-medium">
            {weeklyProgress.percentage}%
          </Text>
        </View>
        <View className="mt-2 h-2 w-full bg-muted/30 rounded-full overflow-hidden">
          <View
            className="h-full bg-success rounded-full"
            style={{ width: `${weeklyProgress.percentage}%` }}
          />
        </View>
      </View>
    </Card>
  );
}

export default HabitWeeklyView;
