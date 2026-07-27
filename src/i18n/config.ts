export type Locale = (typeof locales)[number];

export const locales = ['en', 'si', 'ta'] as const;
export const defaultLocale: Locale = 'en';
