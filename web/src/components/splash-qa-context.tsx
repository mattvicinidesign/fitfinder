"use client";

import { createContext, useContext } from "react";

type SplashQaContextValue = {
  replaySplash: () => void;
};

const SplashQaContext = createContext<SplashQaContextValue | null>(null);

export function SplashQaProvider({
  value,
  children,
}: {
  value: SplashQaContextValue;
  children: React.ReactNode;
}) {
  return (
    <SplashQaContext.Provider value={value}>{children}</SplashQaContext.Provider>
  );
}

export function useSplashQa(): SplashQaContextValue | null {
  return useContext(SplashQaContext);
}
