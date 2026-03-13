export const FEATURES = {
  friendMessaging: true,
  marketplaceMessaging: true,
  maintenanceUtilities: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature];
}
