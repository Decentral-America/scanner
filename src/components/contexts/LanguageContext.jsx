import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Safe localStorage access - only on client side
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('language') || 'en';
      } catch (error) {
        console.warn('localStorage not available:', error);
        return 'en';
      }
    }
    return 'en';
  });

  const changeLanguage = (lang) => {
    setLanguage(lang);
    // Safe localStorage access
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('language', lang);
      } catch (error) {
        console.warn('localStorage not available:', error);
      }
    }
  };

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};