import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { colors, radius } from '@/ui/tokens';

const sources = [
  { title: 'Video yükle', note: 'İlk vertical slice için gerekli', phase: 'Phase 3' },
  { title: 'Link ile getir', note: 'MVP genişletmesinde değerlendirilecek', phase: 'Sonra' },
  { title: 'Kamerayla çek', note: 'Referans video kaynağı olarak MVP dışı', phase: 'MVP dışı' },
];

export default function NewDanceScreen() {
  return (
    <Screen eyebrow="Yeni proje" title="Dans videosunu getir">
      <Text style={styles.intro}>Kaynağı seçtikten sonra gerçek akış dosyayı doğrulayacak, private Storage'a yükleyecek ve güvenilir analiz işini başlatacak.</Text>
      <View style={styles.list}>
        {sources.map((source) => (
          <View key={source.title} style={styles.row}>
            <View style={styles.icon}><Text style={styles.iconText}>♪</Text></View>
            <View style={styles.copy}>
              <Text style={styles.rowTitle}>{source.title}</Text>
              <Text style={styles.note}>{source.note}</Text>
            </View>
            <Text style={styles.phase}>{source.phase}</Text>
          </View>
        ))}
      </View>
      <Button label="Galeriden video seç" disabled accessibilityHint="Phase 3 tamamlandığında etkinleşecek" />
      <Text style={styles.warning}>Bu Phase 1 kabuğu dosya seçilmiş veya analiz tamamlanmış gibi davranmaz.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14 },
  icon: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: colors.accent, fontSize: 20, fontWeight: '900' },
  copy: { flex: 1, gap: 3 },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  note: { color: colors.muted, fontSize: 12 },
  phase: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  warning: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
