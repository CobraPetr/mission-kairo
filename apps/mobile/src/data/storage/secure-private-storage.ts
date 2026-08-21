import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { type KeyValueStorage } from '../repositories/onboarding-repository';

const CHUNK_SIZE = 1_800;
const KEY_PREFIX = 'winterarc.private.';

function safeKey(key: string): string {
  return `${KEY_PREFIX}${key.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

function chunkKey(key: string, index: number): string {
  return `${safeKey(key)}.${index}`;
}

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

async function readChunkCount(key: string): Promise<number> {
  const rawCount = await SecureStore.getItemAsync(`${safeKey(key)}.count`);
  const count = Number(rawCount);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

const nativePrivateStorage: KeyValueStorage = {
  async getItem(key) {
    const count = await readChunkCount(key);
    if (count === 0) return null;

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
    );
    return chunks.some((chunk) => chunk === null) ? null : chunks.join('');
  },

  async removeItem(key) {
    const count = await readChunkCount(key);
    await Promise.all([
      SecureStore.deleteItemAsync(`${safeKey(key)}.count`),
      ...Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index)),
      ),
    ]);
  },

  async setItem(key, value) {
    const previousCount = await readChunkCount(key);
    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [''];

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkKey(key, index), chunk, secureOptions),
      ),
    );
    await SecureStore.setItemAsync(`${safeKey(key)}.count`, String(chunks.length), secureOptions);

    if (previousCount > chunks.length) {
      await Promise.all(
        Array.from({ length: previousCount - chunks.length }, (_, index) =>
          SecureStore.deleteItemAsync(chunkKey(key, index + chunks.length)),
        ),
      );
    }
  },
};

const webPrivateStorage: KeyValueStorage = {
  async getItem(key) {
    return globalThis.sessionStorage?.getItem(safeKey(key)) ?? null;
  },
  async removeItem(key) {
    globalThis.sessionStorage?.removeItem(safeKey(key));
  },
  async setItem(key, value) {
    globalThis.sessionStorage?.setItem(safeKey(key), value);
  },
};

const privateStorage = Platform.OS === 'web' ? webPrivateStorage : nativePrivateStorage;

export const securePrivateStorage: KeyValueStorage = {
  async getItem(key) {
    const secured = await privateStorage.getItem(key);
    if (secured) return secured;

    const legacy = await AsyncStorage.getItem(key);
    if (!legacy) return null;
    await privateStorage.setItem(key, legacy);
    await AsyncStorage.removeItem(key);
    return legacy;
  },

  async removeItem(key) {
    await Promise.all([privateStorage.removeItem(key), AsyncStorage.removeItem(key)]);
  },

  async setItem(key, value) {
    await privateStorage.setItem(key, value);
    await AsyncStorage.removeItem(key);
  },
};
