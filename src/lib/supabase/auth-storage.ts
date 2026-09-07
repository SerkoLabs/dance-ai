import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_BYTE_LIMIT = 1800;
const encoder = new TextEncoder();

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

type ChunkManifest = {
  version: string;
  count: number;
};

function manifestKey(key: string) {
  return `${key}:manifest`;
}

function chunkKey(key: string, version: string, index: number) {
  return `${key}:chunk:${version}:${index}`;
}

function splitByUtf8Bytes(value: string): string[] {
  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;

  for (const character of value) {
    const byteLength = encoder.encode(character).length;
    if (current && currentBytes + byteLength > CHUNK_BYTE_LIMIT) {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += character;
    currentBytes += byteLength;
  }

  if (current || value.length === 0) chunks.push(current);
  return chunks;
}

async function readManifest(key: string): Promise<ChunkManifest | null> {
  const raw = await SecureStore.getItemAsync(manifestKey(key));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ChunkManifest;
    if (!parsed.version || !Number.isInteger(parsed.count) || parsed.count < 1 || parsed.count > 32) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function deleteManifestChunks(key: string, manifest: ChunkManifest | null) {
  if (!manifest) return;
  await Promise.all(
    Array.from({ length: manifest.count }, (_, index) =>
      SecureStore.deleteItemAsync(chunkKey(key, manifest.version, index)),
    ),
  );
}

const nativeSecureStorage: StorageAdapter = {
  async getItem(key) {
    const manifest = await readManifest(key);
    if (!manifest) return null;

    const chunks = await Promise.all(
      Array.from({ length: manifest.count }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, manifest.version, index)),
      ),
    );

    if (chunks.some((chunk) => chunk === null)) return null;
    return chunks.join('');
  },

  async setItem(key, value) {
    const previousManifest = await readManifest(key);
    const version = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const chunks = splitByUtf8Bytes(value);

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkKey(key, version, index), chunk, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        }),
      ),
    );

    const nextManifest: ChunkManifest = { version, count: chunks.length };
    await SecureStore.setItemAsync(manifestKey(key), JSON.stringify(nextManifest), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });

    await deleteManifestChunks(key, previousManifest);
  },

  async removeItem(key) {
    const manifest = await readManifest(key);
    await SecureStore.deleteItemAsync(manifestKey(key));
    await deleteManifestChunks(key, manifest);
  },
};

const webStorage: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

export const authStorage: StorageAdapter = Platform.OS === 'web' ? webStorage : nativeSecureStorage;
