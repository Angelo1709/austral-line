"use client";

// Rail lateral copiado del patrón de Midday (apps/dashboard/src/components/sidebar.tsx + main-menu.tsx):
// 70px colapsado, se expande a 240px con hover.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { puedeVer, secciones, type Rol } from "@/lib/secciones";

export function useSeccionActiva() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

export function Sidebar({ rol, footer }: { rol?: Rol; footer: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = useSeccionActiva();

  return (
    <aside
      className={cn(
        "fixed top-0 z-50 hidden h-screen flex-col justify-between border-r bg-background pb-4 transition-all duration-200 md:flex",
        isExpanded ? "w-[240px]" : "w-[70px]",
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex h-[70px] items-center border-b px-[22px]">
        <Link href="/" className="font-serif text-xl">A</Link>
        {isExpanded && <span className="ml-3 whitespace-nowrap text-sm">Emprendimientos Austral</span>}
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-2">
        {secciones.filter((s) => puedeVer(rol, s.roles)).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="group relative h-[40px]">
            <div
              className={cn(
                "mx-[15px] h-[40px] border border-transparent transition-all duration-200",
                isActive(href) && "border-[#e6e6e6] bg-[#f7f7f7] dark:border-[#1d1d1d] dark:bg-[#131313]",
                isExpanded ? "w-[calc(100%-30px)]" : "w-[40px]",
              )}
            />
            <div className={cn(
              "absolute left-[15px] top-0 flex h-[40px] w-[40px] items-center justify-center text-black group-hover:text-primary! dark:text-[#666666]",
              isActive(href) && "dark:text-white",
            )}>
              <Icon size={20} strokeWidth={1.5} />
            </div>
            {isExpanded && (
              <span className={cn(
                "absolute left-[55px] top-0 flex h-[40px] items-center whitespace-nowrap text-sm font-medium text-[#666] group-hover:text-primary",
                isActive(href) && "text-primary",
              )}>
                {label}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className={cn("px-[15px]", !isExpanded && "invisible")}>{footer}</div>
    </aside>
  );
}

export function MobileNav({ rol }: { rol?: Rol }) {
  const isActive = useSeccionActiva();
  return (
    <nav className="flex min-w-0 flex-1 gap-4 overflow-x-auto md:hidden">
      {secciones.filter((s) => puedeVer(rol, s.roles)).map(({ href, label }) => (
        <Link key={href} href={href} className={cn("whitespace-nowrap text-sm text-[#666]", isActive(href) && "text-primary")}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
