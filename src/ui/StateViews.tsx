import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/ui/Button';
import { colors, radius } from '@/ui/tokens';

type StateProps = {
  title: string;
  message: string;
};

export function LoadingState({ title, message }: StateProps) {
  return <StateCard symbol="···" title={title} message={message} />;
}

export function EmptyState({ title, message }: StateProps) {
  return <StateCard symbol="＋" title={title} message={message} />;
}

export function ErrorState({ title, message }: StateProps & { onRetry?: () => void }) {
  return <StateCard symbol="!" title={title} message={message} />;
}

export function StartupErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.fullPage}>
      <View style={styles.logo}><Text style={styles.logoText}>DA</Text></View>
      <Text accessibilityRole="header" style={styles.fullTitle}>Dance AI açılamadı</Text>
      <Text style={styles.fullMessage}>{message}</Text>
      <Button label="Tekrar dene" onPress={onRetry} />
      <Text style={styles.note}>Ayrıcalıklı anahtarlar mobil uygulamaya eklenmez.</Text>
    </View>
  );
}

export function OfflineBanner() {
  return (
    <View accessibilityLiveRegion="polite" style={styles.offline}>
      <Text style={styles.offlineText}>Çevrimdışısın. Bazı işlemler bağlantı gelene kadar bekleyecek.</Text>
    </View>
  );
}

function StateCard({ symbol, title, message }: StateProps & { symbol: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.symbol}><Text style={styles.symbolText}>{symbol}</Text></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 22, alignItems: 'center', gap: 8 },
  symbol: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  symbolText: { color: colors.accent, fontSize: 22, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  message: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  fullPage: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 28, gap: 14 },
  logo: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: colors.accent, fontSize: 20, fontWeight: '900' },
  fullTitle: { color: colors.ink, fontSize: 28, fontWeight: '900' },
  fullMessage: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  offline: { backgroundColor: '#FFF4E5', borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 12 },
  offlineText: { color: '#7A2E0E', fontSize: 13, fontWeight: '600' },
});
