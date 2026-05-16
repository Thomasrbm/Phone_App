import { Redirect } from 'expo-router';
import { toDayKey } from '@/lib/date';

export default function Index() {
  const today = toDayKey(new Date());
  return <Redirect href={`/calendar/${today}`} />;
}
