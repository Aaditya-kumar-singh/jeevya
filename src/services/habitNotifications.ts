import { Platform } from 'react-native';
import { getHabits } from '@/services/habits';
import { loadData, saveData } from '@/lib/storage';

type NotificationsModule = typeof import('expo-notifications');
let notificationsModule: NotificationsModule | null = null;
let handlerConfigured = false;

async function getNotifications(): Promise<NotificationsModule> {
  if (notificationsModule) return notificationsModule;
  notificationsModule = await import('expo-notifications');
  return notificationsModule;
}

const KEY='jeevya:habit-reminders:v1';
export interface HabitReminderState { habitId:string; enabled:boolean; notificationIds:string[]; }
export async function configureHabitNotifications(){const Notifications=await getNotifications();if(!handlerConfigured){Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:false})});handlerConfigured=true;}if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('habits',{name:'Jeevya Habits',importance:Notifications.AndroidImportance.DEFAULT});}
export async function scheduleHabitReminder(habitId:string){const Notifications=await getNotifications();await configureHabitNotifications();const permission=await Notifications.getPermissionsAsync();if(!permission.granted&&!(await Notifications.requestPermissionsAsync()).granted)throw new Error('Notification permission was not granted.');const habit=(await getHabits()).find(x=>x.id===habitId);if(!habit||!habit.reminderTime)throw new Error('Habit has no reminder time.');await cancelHabitReminder(habitId);const [hour,minute]=habit.reminderTime.split(':').map(Number);const ids:string[]=[];if(habit.frequency==='daily'){ids.push(await Notifications.scheduleNotificationAsync({content:{title:'Jeevya habit reminder',body:habit.name,data:{habitId}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DAILY,hour,minute}}));}else{for(const weekday of habit.days){const map:any={sunday:1,monday:2,tuesday:3,wednesday:4,thursday:5,friday:6,saturday:7};ids.push(await Notifications.scheduleNotificationAsync({content:{title:'Jeevya habit reminder',body:habit.name,data:{habitId}},trigger:{type:Notifications.SchedulableTriggerInputTypes.WEEKLY,weekday:map[weekday],hour,minute}}));}}const all=await loadData<HabitReminderState[]>(KEY,[]);await saveData(KEY,[...all.filter(x=>x.habitId!==habitId),{habitId,enabled:true,notificationIds:ids}]);return ids;}
export async function cancelHabitReminder(habitId:string){const Notifications=await getNotifications();const all=await loadData<HabitReminderState[]>(KEY,[]);const state=all.find(x=>x.habitId===habitId);if(state)for(const id of state.notificationIds)await Notifications.cancelScheduledNotificationAsync(id);await saveData(KEY,all.filter(x=>x.habitId!==habitId));}
export async function getHabitReminderStates(){return loadData<HabitReminderState[]>(KEY,[]);}
