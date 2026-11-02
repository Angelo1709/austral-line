import { requireRol } from "@/lib/auth";

// Cada página verifica además el rol que necesita.
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireRol("alumno", "mentor", "jurado");
  return children;
}
