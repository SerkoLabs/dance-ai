import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { colors, radius } from '@/ui/tokens';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      await signOut();
    } catch {
      setErrorMessage('Çıkış yapılamadı. Bağlantını kontrol edip tekrar dene.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Ayarlar">
      <View style={styles.card}>
        <Text style={styles.title}>Hesap</Text>
        <Text style={styles.body}>{user?.email ?? 'Oturum açık'}</Text>
        <Button label={busy ? 'Çıkış yapılıyor…' : 'Çıkış yap'} disabled={busy} variant="secondary" onPress={() => void handleSignOut()} />
        {errorMessage ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text> : null}
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Gizlilik varsayılanları</Text>
        <Text style={styles.body}>Referans ve deneme videoları private tutulacak. Kamera yalnızca çalışma anında istenecek; mikrofon MVP denemelerinde kullanılmayacak.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Hesabı sil</Text>
        <Text style={styles.body}>Güvenli silme orkestrasyonu release öncesinde gerçek backend ile tamamlanacak. Bu sürüm sahte silme başarısı göstermez.</Text>
        <Button label="Hesabı sil" disabled variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 18, gap: 10 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, fontWeight: '600' },
});
