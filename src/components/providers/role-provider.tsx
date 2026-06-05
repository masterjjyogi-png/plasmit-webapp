"use client";

import * as React from "react";

import { roles } from "@/data/navigation";
import type { Role } from "@/types";

type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
  roles: Role[];
};

const RoleContext = React.createContext<RoleContextValue | null>(null);
const defaultRole: Role = "Hospital Admin";
const roleStorageKey = "plasmit-role";
const roleChangeEvent = "plasmit-role-change";

function readSavedRole(): Role {
  if (typeof window === "undefined") return defaultRole;
  const saved = window.localStorage.getItem(roleStorageKey);
  return saved && roles.includes(saved as Role) ? (saved as Role) : defaultRole;
}

function subscribeRole(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", callback);
  window.addEventListener(roleChangeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(roleChangeEvent, callback);
  };
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const role = React.useSyncExternalStore(subscribeRole, readSavedRole, () => defaultRole);

  const setRole = React.useCallback((nextRole: Role) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(roleStorageKey, nextRole);
      window.dispatchEvent(new Event(roleChangeEvent));
    }
  }, []);

  const value = React.useMemo(() => ({ role, setRole, roles }), [role, setRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = React.useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used inside RoleProvider");
  }
  return context;
}
