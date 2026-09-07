import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { ErrorState, LoadingState } from '@/ui/StateViews';
import { Screen } from '@/ui/Screen';

export default function AuthLayout() {
  const { status, errorMessage, retryBootstrap } = useAuth();

  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <LoadingState title="Oturum kontrol ediliyor" message="Güvenli oturumun hazırlanıyor." />
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Oturum doğrulanamadı"
          message={errorMessage ?? 'Oturum bilgisi okunamadı.'}
          onRetry={retryBootstrap}
        />
      </Screen>
    );
  }

  if (status === 'authenticated') {
    return <Redirect href="/(app)/projects" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
