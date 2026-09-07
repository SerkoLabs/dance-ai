import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { ErrorState, LoadingState } from '@/ui/StateViews';
import { Screen } from '@/ui/Screen';

export default function AppLayout() {
  const { status, errorMessage, retryBootstrap } = useAuth();

  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <LoadingState title="Dance AI hazırlanıyor" message="Oturumun ve güvenli uygulama alanın yükleniyor." />
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Oturum kontrolü başarısız"
          message={errorMessage ?? 'Bağlantını kontrol edip tekrar dene.'}
          onRetry={retryBootstrap}
        />
      </Screen>
    );
  }

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
