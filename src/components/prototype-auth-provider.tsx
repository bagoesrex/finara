"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  PrototypeAccount,
  PrototypeAuthState,
  PrototypeUser,
} from "@/lib/auth";
import { userProfile } from "@/lib/mock-data";

type RegisterIdentity = Pick<PrototypeUser, "name" | "email">;

type PrototypeAuthContextValue = PrototypeAuthState & {
  completeOnboarding: (account: PrototypeAccount) => void;
  register: (identity: RegisterIdentity) => void;
  signIn: (email: string) => void;
  signOut: () => void;
};

const signedOutState: PrototypeAuthState = {
  status: "signed-out",
  user: null,
  account: null,
};

const PrototypeAuthContext =
  createContext<PrototypeAuthContextValue | null>(null);

export function PrototypeAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PrototypeAuthState>(signedOutState);

  const signIn = useCallback((email: string) => {
    setState({
      status: "ready",
      user: {
        id: "demo-user",
        name: userProfile.name,
        email: email.trim().toLocaleLowerCase("id-ID"),
        kind: "demo",
      },
      account: {
        name: "BCA",
        type: "BANK",
        currentBalance: 4_250_000,
      },
    });
  }, []);

  const register = useCallback((identity: RegisterIdentity) => {
    setState({
      status: "needs-onboarding",
      user: {
        id: `local-${crypto.randomUUID()}`,
        name: identity.name.trim(),
        email: identity.email.trim().toLocaleLowerCase("id-ID"),
        kind: "new",
      },
      account: null,
    });
  }, []);

  const completeOnboarding = useCallback((account: PrototypeAccount) => {
    setState((current) => {
      if (current.status !== "needs-onboarding") return current;
      return { status: "ready", user: current.user, account };
    });
  }, []);

  const signOut = useCallback(() => setState(signedOutState), []);

  const value = useMemo(
    () => ({
      ...state,
      completeOnboarding,
      register,
      signIn,
      signOut,
    }),
    [completeOnboarding, register, signIn, signOut, state],
  );

  return (
    <PrototypeAuthContext.Provider value={value}>
      {children}
    </PrototypeAuthContext.Provider>
  );
}

export function usePrototypeAuth(): PrototypeAuthContextValue {
  const context = useContext(PrototypeAuthContext);
  if (!context) {
    throw new Error(
      "usePrototypeAuth must be used inside PrototypeAuthProvider",
    );
  }
  return context;
}
