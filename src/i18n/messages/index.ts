import { en, type Messages } from './en';
import { ja } from './ja';
import type { Locale } from '../locales';

export { en, ja };
export type { Messages };

export const messages: Record<Locale, Messages> = {
  en,
  ja,
};
