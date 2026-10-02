import { ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { BarChart3, Bell, CalendarDays, CheckSquare, GitBranch, Layers3, Target, Zap } from 'lucide-react-native';
import { Card, Heading, Text, Button, ButtonText } from '@/components/ui';
import { FadeInView } from '@/components/motion/FadeInView';
import { useTasks } from '@/hooks/useTasks';
import { computeTaskAnalytics } from '@/lib/task-analytics';

const links=[['Calendar','Day/week planning, recurrence and carry-forward','/tasks/calendar',CalendarDays],['Analytics','Completion, punctuality, priority and trends','/tasks/analytics',BarChart3],['Bulk actions','Complete, archive, prioritize and reschedule many tasks','/tasks/bulk',Layers3],['Recurrence','Exceptions and carry-forward rules','/tasks/recurrence',GitBranch],['Reminders','Schedule task notifications','/tasks/reminders',Bell],['Goal & habit links','Connect tasks to goals and habits','/tasks/links',Target]] as const;

export default function TasksAdvanced(){const {tasks}=useTasks();const stats=computeTaskAnalytics(tasks,30);return <ScrollView className="flex-1 bg-background"><View className="gap-4 px-5 pb-12 pt-14"><FadeInView><Text size="xs" className="font-semibold uppercase tracking-wider text-violet-500">Advanced productivity</Text><Heading size="xl" className="mt-1">Task Command Center</Heading><Text size="sm" className="mt-1 text-muted-foreground">Planning, recurrence, analytics, links, reminders and bulk operations.</Text></FadeInView><Card className="p-5"><View className="flex-row gap-3"><View className="flex-1"><Text size="xs" className="text-muted-foreground">Completion</Text><Heading size="lg">{Math.round(stats.completionRate)}%</Heading></View><View className="flex-1"><Text size="xs" className="text-muted-foreground">Completed</Text><Heading size="lg">{stats.completed}</Heading></View><View className="flex-1"><Text size="xs" className="text-muted-foreground">Overdue</Text><Heading size="lg">{stats.overdue}</Heading></View></View></Card>{links.map(([title,desc,href,Icon])=><Link key={title} href={href as any} asChild><Button variant="outline" className="h-auto justify-start p-4"><Icon size={20} className="mr-3 text-primary"/><View className="flex-1"><ButtonText className="text-left">{title}</ButtonText><Text size="xs" className="mt-1 text-muted-foreground">{desc}</Text></View></Button></Link>)}</View></ScrollView>}


