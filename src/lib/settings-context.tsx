'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ensureSeeded, getSettings, saveSettings } from './db';
import type { MarketId } from './markets';

interface SettingsContextValue {
  loaded: boolean;
  surveyorName: string | null;
  darkMode: boolean;
  remoteEndpoint: string | null;
  login: (name: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  setRemoteEndpoint: (url: string | null) => Promise<void>;
  activeMarket: MarketId;
  setActiveMarket: (m: MarketId) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function applyDarkClass(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [surveyorName, setSurveyorName] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [remoteEndpoint, setRemoteEndpointState] = useState<string | null>(null);
  const [activeMarket, setActiveMarketState] = useState<MarketId>('qadisiyah');

  useEffect(() => {
    (async () => {
      await ensureSeeded();
      const s = await getSettings();
      setSurveyorName(s.surveyorName);
      setDarkMode(s.darkMode);
      setRemoteEndpointState(s.remoteEndpoint);
      setActiveMarketState(s.activeMarket);
      applyDarkClass(s.darkMode);
      setLoaded(true);
    })();
  }, []);

  const login = async (name: string) => {
    const s = await getSettings();
    const next = { ...s, surveyorName: name };
    await saveSettings(next);
    localStorage.setItem('qs_surveyor_name', name);
    setSurveyorName(name);
  };

  const logout = async () => {
    const s = await getSettings();
    await saveSettings({ ...s, surveyorName: null });
    localStorage.removeItem('qs_surveyor_name');
    setSurveyorName(null);
  };

  const toggleDarkMode = async () => {
    const s = await getSettings();
    const next = !darkMode;
    await saveSettings({ ...s, darkMode: next });
    localStorage.setItem('qs_dark_mode', String(next));
    setDarkMode(next);
    applyDarkClass(next);
  };

  const setRemoteEndpoint = async (url: string | null) => {
    const s = await getSettings();
    await saveSettings({ ...s, remoteEndpoint: url });
    setRemoteEndpointState(url);
  };

  const setActiveMarket = async (m: MarketId) => {
    setActiveMarketState(m);
    const s = await getSettings();
    await saveSettings({ ...s, activeMarket: m });
  };

  return (
    <SettingsContext.Provider
      value={{ loaded, surveyorName, darkMode, remoteEndpoint, login, logout, toggleDarkMode, setRemoteEndpoint, activeMarket, setActiveMarket }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
