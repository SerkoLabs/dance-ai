import { useLocalSearchParams } from 'expo-router';

import { UnavailableFeatureScreen } from '@/features/shell/UnavailableFeatureScreen';

export default function SectionLearnScreen() {
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  return <UnavailableFeatureScreen phase="Phase 3" title="Bölümü öğren" description={`Bölüm ${sectionId ?? ''} burada gerçek referans videodan loop, 1x / 0.75x / 0.5x ve mirror modlarıyla çalışılacak.`} />;
}
