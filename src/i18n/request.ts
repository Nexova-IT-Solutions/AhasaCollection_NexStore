import {getRequestConfig} from 'next-intl/server';
import {locales} from './config';

export default getRequestConfig(async ({requestLocale}) => {
  // Await the locale because it might be a promise
  let locale = await requestLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as any)) {
    locale = 'en';
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
