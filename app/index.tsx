import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { readPublicConfig } from '@/lib/config/public-config';

export default function FoundationScreen() {
  const config = readPublicConfig();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>
          Dance AI
        </Text>
        <Text style={styles.subtitle}>
          See it. Learn it. Dance it.
        </Text>

        <View
          accessibilityLiveRegion="polite"
          style={[styles.statusCard, !config.ok && styles.errorCard]}
        >
          <Text style={styles.statusTitle}>
            {config.ok ? 'Foundation ready' : 'Setup required'}
          </Text>
          <Text style={styles.statusBody}>
            {config.ok
              ? 'The repository foundation is configured. Product flows are added in later phases.'
              : config.message}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111111',
  },
  subtitle: {
    fontSize: 18,
    color: '#444444',
  },
  statusCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  errorCard: {
    borderColor: '#9f2b2b',
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
  },
  statusBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444444',
  },
});
