import { router } from 'expo-router';
import * as Linking from 'expo-linking';

import { publicRuntimeConfig } from '@/config/runtime';

export type PublicDocument = 'privacy' | 'support' | 'terms';

const localRoutes = {
  privacy: '/legal/privacy',
  support: '/support',
  terms: '/legal/terms',
} as const;

export async function openPublicDocument(document: PublicDocument): Promise<void> {
  const configuredUrl =
    document === 'privacy'
      ? publicRuntimeConfig.privacyPolicyUrl
      : document === 'terms'
        ? publicRuntimeConfig.termsUrl
        : publicRuntimeConfig.supportUrl;
  if (configuredUrl) {
    await Linking.openURL(configuredUrl);
    return;
  }
  router.push(localRoutes[document]);
}
