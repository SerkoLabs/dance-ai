import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { colors, radius } from '@/ui/tokens';

type Props = {
  title: string;
  description: string;
  phase: string;
};

export function UnavailableFeatureScreen({ title, description, phase }: Props) {
  return (
    <Screen eyebrow={phase} title={title}>
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Yakında</Text>
        <Text style={styles.previewTitle}>Bu akış henüz gerçek servise bağlı değil.</Text>
        <Text style={styles.previewBody}>{description}</Text>
      </View>
      <Button label="Geri dön" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 24, gap: 10 },
  previewLabel: { alignSelf: 'flex-start', color: colors.accent, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, fontSize: 12, fontWeight: '800' },
  previewTitle: { color: colors.ink, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  previewBody: { color: colors.muted, fontSize: 15, lineHeight: 23 },
});
