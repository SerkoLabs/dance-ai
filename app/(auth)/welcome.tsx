import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { colors, radius } from '@/ui/tokens';

export default function WelcomeScreen() {
  return (
    <Screen scroll={false}>
      <View style={styles.hero}>
        <View style={styles.badge}><Text style={styles.badgeText}>✦ AI DANCE COACH</Text></View>
        <Text accessibilityRole="header" style={styles.title}>Gördüğün dansı gerçekten öğren.</Text>
        <Text style={styles.body}>Bir dans videosunu getir. Dance AI koreografiyi küçük bölümlere ayırsın, sana yavaşça öğretsin ve denemelerini ölçülebilir geri bildirimle geliştirsin.</Text>
      </View>

      <View style={styles.steps}>
        {['Dans videosunu getir', 'Hareketleri bölüm bölüm öğren', 'Kamerayla dene ve düzelt'].map((label, index) => (
          <View key={label} style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
            <Text style={styles.stepLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button label="Başla" onPress={() => router.push('/(auth)/sign-in')} />
        <Text style={styles.phaseNote}>Kimlik doğrulama Phase 2'de gerçek Supabase Auth ile bağlanacak.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, justifyContent: 'center', gap: 14 },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: colors.accent, fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  title: { color: colors.ink, fontSize: 40, lineHeight: 45, fontWeight: '900', letterSpacing: -1.1 },
  body: { color: colors.muted, fontSize: 17, lineHeight: 26 },
  steps: { gap: 10, marginBottom: 16 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  stepNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#FFFFFF', fontWeight: '900' },
  stepLabel: { color: colors.ink, fontSize: 15, fontWeight: '700', flex: 1 },
  actions: { gap: 10 },
  phaseNote: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
