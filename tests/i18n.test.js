import { describe, it, expect, beforeEach } from 'vitest';
import { getLang, setLang, initLang, toggleLang, translations } from '../src/ui/i18n.js';
import { LANG_STORAGE_KEY } from '../src/config.js';

beforeEach(() => {
  setLang('ar');
  localStorage.clear();
});

describe('i18n', () => {
  it('persists the language on setLang and restores it via initLang', () => {
    setLang('en');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
    setLang('ar'); // simulate the boot default…
    localStorage.setItem(LANG_STORAGE_KEY, 'en'); // …with a saved preference
    expect(initLang()).toBe('en');
    expect(getLang()).toBe('en');
  });

  it('ignores invalid saved values', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'fr');
    expect(initLang()).toBe('ar');
  });

  it('toggleLang flips between ar and en', () => {
    expect(toggleLang()).toBe('en');
    expect(toggleLang()).toBe('ar');
  });

  it('both languages define the same translation keys', () => {
    expect(Object.keys(translations.en).sort()).toEqual(Object.keys(translations.ar).sort());
  });
});
