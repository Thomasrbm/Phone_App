import HorizonScreen from '@/components/objectives/HorizonScreen';

// Static route — wins over [id].tsx because expo-router prefers
// concrete paths over dynamic catches.
export default function LongHorizonRoute() {
  return <HorizonScreen horizon="long" />;
}
