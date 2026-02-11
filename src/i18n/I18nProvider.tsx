import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lang, TransKey, t as translate } from './translations';

interface I18nState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TransKey) => string;
  isRtl: boolean;
}

const I18nContext = createContext<I18nState | null>(null);

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be inside I18nProvider');
  return ctx;
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('fitlog-lang') as Lang) || 'he';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('fitlog-lang', l);
  };

  const isRtl = lang === 'he';

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isRtl]);

  const tFn = (key: TransKey) => translate(key, lang);

  return (
    <I18nContext.Provider value={{ lang, setLang, t: tFn, isRtl }}>
      {children}
    </I18nContext.Provider>
  );
};
