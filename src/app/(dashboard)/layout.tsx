import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuario } from "@/lib/auth";
import { roles } from "@/lib/secciones";
import { MobileNav, Sidebar } from "@/components/sidebar";

async function logout() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function Menu() {
  const { persona } = await getUsuario();
  return <Sidebar rol={persona?.rol} footer={null} />;
}

async function MenuMobile() {
  const { persona } = await getUsuario();
  return <MobileNav rol={persona?.rol} />;
}

async function UsuarioActual() {
  const { email, persona } = await getUsuario();
  return persona ? `${persona.nombre} · ${roles[persona.rol]}` : email;
}

// Layout del dashboard al estilo Midday: rail de 70px + header de 70px + contenido px-8.
// cacheComponents está activo: todo lo que lee datos va dentro de <Suspense>.
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  const salir = (
    <form action={logout}>
      <button className="whitespace-nowrap text-sm text-[#666] hover:text-primary">Cerrar sesión</button>
    </form>
  );

  return (
    <div className="relative">
      <Suspense><Menu /></Suspense>
      <div className="pb-4 md:ml-[70px]">
        <header className="flex h-[70px] items-center justify-between gap-4 border-b px-4 md:px-8">
          <Suspense><MenuMobile /></Suspense>
          <span className="ml-auto hidden truncate text-sm text-[#666] sm:block"><Suspense><UsuarioActual /></Suspense></span>
          {/* Siempre visible: en celulares y tablets compartidas hay que poder salir (#19). */}
          <div className="shrink-0">{salir}</div>
        </header>
        <main className="px-4 py-6 md:px-8">
          <Suspense fallback={<p className="text-sm text-[#666]">Cargando…</p>}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
