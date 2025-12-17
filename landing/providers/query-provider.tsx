// Stub provider for static build
import { ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
