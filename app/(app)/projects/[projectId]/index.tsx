import { useLocalSearchParams } from 'expo-router';

import { UnavailableFeatureScreen } from '@/features/shell/UnavailableFeatureScreen';

export default function ProjectResolverScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  return <UnavailableFeatureScreen phase="Phase 3" title="Koreografi analizi" description={`Proje ${projectId ?? ''} için gerçek durum çözümleyici; processing, ready ve failed durumlarını backend'den okuyacak.`} />;
}
