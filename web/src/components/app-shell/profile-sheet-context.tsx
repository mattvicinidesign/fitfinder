"use client";

import { createContext, useContext } from "react";

const ProfileSheetCloseContext = createContext<(() => void) | null>(null);

export function ProfileSheetCloseProvider({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <ProfileSheetCloseContext.Provider value={onClose}>
      {children}
    </ProfileSheetCloseContext.Provider>
  );
}

export function useProfileSheetClose(): (() => void) | null {
  return useContext(ProfileSheetCloseContext);
}
