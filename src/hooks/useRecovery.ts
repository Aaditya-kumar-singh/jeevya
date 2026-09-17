import {useCallback,useEffect,useState} from 'react';
import {getRecoveryForDate,getRecoveryForDateRange,getTodayRecovery,type RecoveryResult} from '@/services/recovery';
export function useRecovery(){const [today,setToday]=useState<RecoveryResult|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState<string|null>(null);const loadRecovery=useCallback(async(date?:string)=>{setLoading(true);setError(null);try{const r=date?await getRecoveryForDate(date):await getTodayRecovery();setToday(r);return r}catch(e){const m=e instanceof Error?e.message:'Failed to load recovery';setError(m);throw e}finally{setLoading(false)}},[]);useEffect(()=>{ // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRecovery();
  },[loadRecovery]);const getForDate=useCallback((date:string)=>getRecoveryForDate(date),[]);const getForDateRange=useCallback((a:string,b:string)=>getRecoveryForDateRange(a,b),[]);return{today,loading,error,loadRecovery,getRecoveryForDate:getForDate,getRecoveryForDateRange:getForDateRange};}


