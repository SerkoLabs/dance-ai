import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { colors, radius } from '@/ui/tokens';

export default function SignInScreen() {
  return (
    <Screen eyebrow="Phase 2" title="E-posta ile giriş">
      <View style={styles.card}>
        <Text style={styles.title}>Gerçek OTP akışı henüz bağlı değil.</Text>
        <Text style={styles.body}>Bu ekranda e-posta doğrulaması, OTP gönderimi, tekrar gönderme ve oturum yönetimi Supabase Auth ile uygulanacak. Şimdilik sahte başarı üretmiyoruz.</Text>
      </View>
      <Button label="OTP ile devam et" disabled />
      <Button label="Uygulama kabuğunu önizle" variant="secondary" onPress={() => router.replace('/(app)/projects')} />
      <Text style={styles.note}>Önizleme yalnızca Phase 1 navigasyonunu doğrulamak içindir; kimlik doğrulama bypass'ı Phase 2'de kaldırılacak.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 22, gap: 10 },
  title: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
