import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/StateViews';
import { Screen } from '@/ui/Screen';
import { colors, radius } from '@/ui/tokens';

export default function ProjectsScreen() {
  return (
    <Screen eyebrow="Dance AI" title="Danslarım" right={<Button label="Ayarlar" variant="ghost" onPress={() => router.push('/(app)/settings')} />}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>SEE IT · LEARN IT · DANCE IT</Text>
        <Text style={styles.heroTitle}>Bir sonraki viral dansını buradan öğren.</Text>
        <Text style={styles.heroBody}>Videoyu getir, sistem bölümlere ayırsın; sonra izle → yavaşlat → dene → düzelt döngüsüne gir.</Text>
        <Button label="＋ Yeni dans" onPress={() => router.push('/(app)/new-dance')} />
      </View>
      <EmptyState title="Henüz dansın yok" message="Phase 3'te yüklediğin gerçek projeler burada, analiz durumları ve ilerlemenle birlikte görünecek." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: 22, gap: 11 },
  kicker: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  heroTitle: { color: colors.ink, fontSize: 24, lineHeight: 30, fontWeight: '900' },
  heroBody: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
