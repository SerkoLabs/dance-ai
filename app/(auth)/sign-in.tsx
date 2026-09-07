import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSupabase } from '@/lib/supabase/context';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { colors, radius } from '@/ui/tokens';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6,8}$/;

function friendlyAuthError(kind: 'request' | 'verify') {
  return kind === 'request'
    ? 'Kod gönderilemedi. Bağlantını kontrol et veya kısa bir süre sonra tekrar dene.'
    : 'Kod doğrulanamadı. Kodu kontrol edip tekrar dene.';
}

export default function SignInScreen() {
  const supabase = useSupabase();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [requestedEmail, setRequestedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const emailIsValid = EMAIL_PATTERN.test(normalizedEmail);
  const otpIsValid = OTP_PATTERN.test(otp.trim());

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const requestOtp = async (targetEmail: string) => {
    setBusy(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { shouldCreateUser: true },
    });

    setBusy(false);
    if (error) {
      setErrorMessage(friendlyAuthError('request'));
      return false;
    }

    setRequestedEmail(targetEmail);
    setStep('otp');
    setResendSeconds(60);
    return true;
  };

  const submitEmail = async () => {
    if (!emailIsValid) {
      setErrorMessage('Geçerli bir e-posta adresi gir.');
      return;
    }
    await requestOtp(normalizedEmail);
  };

  const verifyOtp = async () => {
    if (!requestedEmail || !otpIsValid) {
      setErrorMessage('E-postana gelen doğrulama kodunu eksiksiz gir.');
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    const { data, error } = await supabase.auth.verifyOtp({
      email: requestedEmail,
      token: otp.trim(),
      type: 'email',
    });
    setBusy(false);

    if (error || !data.session) {
      setErrorMessage(friendlyAuthError('verify'));
      return;
    }

    router.replace('/(app)/projects');
  };

  return (
    <Screen eyebrow="Güvenli giriş" title={step === 'email' ? 'E-posta ile devam et' : 'Kodunu gir'}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        {step === 'email' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>Şifre yok.</Text>
              <Text style={styles.body}>E-postanı yaz; sana tek kullanımlık doğrulama kodu gönderelim. Kamera veya galeri izni bu aşamada istenmez.</Text>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>E-posta</Text>
              <TextInput
                accessibilityLabel="E-posta adresi"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                placeholderTextColor="#98A2B3"
                style={styles.input}
                textContentType="emailAddress"
                value={email}
              />
            </View>
            {errorMessage ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text> : null}
            <Button label={busy ? 'Kod gönderiliyor…' : 'Kod gönder'} disabled={busy} onPress={() => void submitEmail()} />
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>E-postanı kontrol et</Text>
              <Text style={styles.body}>{requestedEmail} adresine gelen tek kullanımlık kodu gir.</Text>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Doğrulama kodu</Text>
              <TextInput
                accessibilityLabel="Doğrulama kodu"
                autoComplete="one-time-code"
                keyboardType="number-pad"
                maxLength={8}
                onChangeText={(value) => setOtp(value.replace(/\D/g, ''))}
                placeholder="••••••"
                placeholderTextColor="#98A2B3"
                style={[styles.input, styles.otpInput]}
                textContentType="oneTimeCode"
                value={otp}
              />
            </View>
            {errorMessage ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text> : null}
            <Button label={busy ? 'Doğrulanıyor…' : 'Doğrula ve devam et'} disabled={busy} onPress={() => void verifyOtp()} />
            <Button
              label={resendSeconds > 0 ? `Tekrar gönder (${resendSeconds})` : 'Kodu tekrar gönder'}
              disabled={busy || resendSeconds > 0}
              variant="secondary"
              onPress={() => void requestOtp(requestedEmail)}
            />
            <Button
              label="E-postayı değiştir"
              disabled={busy}
              variant="ghost"
              onPress={() => {
                setStep('email');
                setOtp('');
                setErrorMessage(null);
              }}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 22, gap: 10 },
  title: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  fieldGroup: { gap: 7 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  input: { minHeight: 54, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 16, color: colors.ink, fontSize: 16 },
  otpInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: '800' },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, fontWeight: '600' },
});
