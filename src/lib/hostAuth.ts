import { CurrentUserRead } from "@/types/user/user";
import { useContext } from "react";

/** Minimal shape of the host auth context — no host imports. */
interface AuthContextType {
  user: CurrentUserRead | undefined;
}

declare global {
  interface Window {
    AuthUserContext?: React.Context<AuthContextType | null>;
  }
}

export function useAuthContext() {
  const ctx = useContext(window.AuthUserContext!);
  if (!ctx) {
    throw new Error(
      "useAuthContext: window.AuthUserContext unavailable — is this running inside CARE?",
    );
  }
  return ctx;
}

export function useAuthUser() {
  const user = useAuthContext().user;
  if (!user) {
    throw new Error("useAuthUser: no authenticated user");
  }
  return user;
}