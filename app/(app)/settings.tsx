import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/ui/Screen';
import { colors, radius } from '@/ui/tokens';

export default function SettingsScreen() {
  return (
    <Screen title="Ayarlar">
      <View style={styles.card}>
        <Text style={styles.title}>Gizlilik varsayılanları</Text>
        <Text style={styles.body}>Referans ve deneme videoları private tutulacak. Kamera yalnızca çalışma anında istenecek; mikrofon MVP denemelerinde kullanılmayacak.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Hesap</Text>
        <Text style={styles.body}>Oturum, çıkış ve hesap silme davranışları Phase 2 ve release-readiness aşamalarında gerçek backend ile bağlanacak.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 18, gap: 8 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
