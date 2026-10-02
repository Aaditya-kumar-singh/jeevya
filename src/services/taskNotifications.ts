import { Platform } from 'react-native';
import { getTaskReminders, setTaskReminder, deleteTaskReminder } from '@/services/productivityAdvanced';

type NotificationsModule = typeof import('expo-notifications');
let notificationsModule: NotificationsModule | null = null;
let handlerConfigured = false;

async function getNotifications(): Promise<NotificationsModule> {
  if (notificationsModule) return notificationsModule;
  notificationsModule = await import('expo-notifications');
  return notificationsModule;
}

let configured=false;
export async function configureTaskNotifications(){if(configured)return;const Notifications=await getNotifications();configured=true;if(!handlerConfigured){Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:false})});handlerConfigured=true;}if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('tasks',{name:'Jeevya Tasks',importance:Notifications.AndroidImportance.DEFAULT});}
export async function requestTaskNotificationPermission(){const Notifications=await getNotifications();await configureTaskNotifications();const p=await Notifications.getPermissionsAsync();if(p.granted)return true;return (await Notifications.requestPermissionsAsync()).granted;}
export async function scheduleTaskReminder(taskId:string,title:string,date:string,time:string){const Notifications=await getNotifications();if(!(await requestTaskNotificationPermission()))throw new Error('Notification permission was not granted.');const existing=(await getTaskReminders()).find(x=>x.taskId===taskId);if(existing?.notificationId)await Notifications.cancelScheduledNotificationAsync(existing.notificationId);const id=await Notifications.scheduleNotificationAsync({content:{title:'Jeevya task reminder',body:title,data:{taskId}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(date+'T'+time+':00')}});const saved=await setTaskReminder(taskId,title,date,time,true);const all=await getTaskReminders();const {saveData}=await import('@/lib/storage');await saveData('jeevya:task-reminders:v1',all.map(x=>x.id===saved.id?{...x,notificationId:id}:x));return id;}
export async function cancelTaskReminder(taskId:string){const Notifications=await getNotifications();const existing=(await getTaskReminders()).find(x=>x.taskId===taskId);if(existing?.notificationId)await Notifications.cancelScheduledNotificationAsync(existing.notificationId);await deleteTaskReminder(taskId);}
