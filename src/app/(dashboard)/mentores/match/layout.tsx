import { requireRol } from "@/lib/auth";

// Match proyecto–mentor: solo el coordinador (admin).
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireRol();
  return children;
}
