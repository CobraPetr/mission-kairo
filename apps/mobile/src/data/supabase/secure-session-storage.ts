import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1_800;
const KEY_PREFIX = 'winterarc.session.';

function storageKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

function chunkKey(key: string, index: number): string {
  return `${storageKey(key)}.${index}`;
}

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

async function readChunkCount(key: string): Promise<number> {
  const rawCount = await SecureStore.getItemAsync(`${storageKey(key)}.count`);
  const count = Number(rawCount);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

const nativeStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await readChunkCount(key);
    if (count === 0) {
      return null;
    }

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
    );

    if (chunks.some((chunk) => chunk === null)) {
      return null;
    }

    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const previousCount = await readChunkCount(key);
    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [''];

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkKey(key, index), chunk, secureOptions),
      ),
    );
    await SecureStore.setItemAsync(
      `${storageKey(key)}.count`,
      String(chunks.length),
      secureOptions,
    );

    if (previousCount > chunks.length) {
      await Promise.all(
        Array.from({ length: previousCount - chunks.length }, (_, index) =>
          SecureStore.deleteItemAsync(chunkKey(key, index + chunks.length)),
        ),
      );
    }
  },

  async removeItem(key: string): Promise<void> {
    const count = await readChunkCount(key);
    await Promise.all([
      SecureStore.deleteItemAsync(`${storageKey(key)}.count`),
      ...Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index)),
      ),
    ]);
  },
};

const webStorage = {
  async getItem(key: string): Promise<string | null> {
    return globalThis.localStorage?.getItem(storageKey(key)) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    globalThis.localStorage?.setItem(storageKey(key), value);
  },
  async removeItem(key: string): Promise<void> {
    globalThis.localStorage?.removeItem(storageKey(key));
  },
};

export const secureSessionStorage = Platform.OS === 'web' ? webStorage : nativeStorage;
