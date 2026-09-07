import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Dance AI',
  slug: 'dance-ai',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'danceai',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission: 'Dance AI uses the camera only when you choose to record a dance attempt.',
        microphonePermission: false,
        recordAudioAndroid: false
      }
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Dance AI lets you choose a dance video from your library to create a lesson.',
        microphonePermission: false
      }
    ],
    'expo-secure-store'
  ],
  experiments: {
    typedRoutes: true
  },
  web: {
    bundler: 'metro'
  },
  extra: {
    product: 'dance-ai'
  }
});
