"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  HomeIcon,
  TableCellsIcon,
  DocumentMagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  Cog6ToothIcon,
  UserCircleIcon
} from "@heroicons/react/24/outline";

const navItems = [
  { name: "Dashboard", href: "/dashboard/overview", icon: <HomeIcon className="w-5 h-5 mr-2" /> },
  { name: "Drug Management", href: "/dashboard/drug-management", icon: <TableCellsIcon className="w-5 h-5 mr-2" /> },
  { name: "Study Review", href: "/dashboard/study-review", icon: <DocumentMagnifyingGlassIcon className="w-5 h-5 mr-2" /> },
  { name: "Audit Trail", href: "/dashboard/audit-trail", icon: <ClipboardDocumentListIcon className="w-5 h-5 mr-2" /> },
  { name: "User Management", href: "/dashboard/user-management", icon: <UsersIcon className="w-5 h-5 mr-2" /> },
  { name: "Settings", href: "/dashboard/settings", icon: <Cog6ToothIcon className="w-5 h-5 mr-2" /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Sidebar open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return (
    <div className="min-h-screen flex bg-[linear-gradient(135deg,_#2584eb_0%,_#4fc3f7_100%)]">
      {/* Sidebar */}
      <aside
        className={`fixed z-40 top-0 left-0 h-full w-64 shadow-2xl border-r-2 border-blue-200 flex flex-col py-8 px-4 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-[linear-gradient(135deg,_#2584eb_80%,_#4fc3f7_100%)] backdrop-blur-md`}
        style={{ minWidth: '16rem', boxShadow: '0 8px 32px 0 rgba(37,99,235,0.18), 0 1.5px 8px 0 rgba(0,0,0,0.08)' }}
      >
        <div className="mb-10 text-center">
          <span className="text-2xl font-black text-white tracking-wider drop-shadow">LIASE</span>
        </div>
        <nav className="flex-1">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-4 py-2 rounded-lg font-medium text-white hover:bg-blue-400/30 hover:text-white transition ${pathname === item.href ? 'bg-blue-400/40 text-white font-bold' : ''}`}
                  onClick={() => {
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                >
                          <span className="inline-flex items-center">{item.icon}{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
  <div className="mt-10 text-center text-xs text-blue-100">© {new Date().getFullYear()} LIASE</div>
      </aside>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black bg-opacity-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {/* Main Content */}
  <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-64' : ''} w-full max-w-full overflow-x-hidden`}>
        {/* Header */}
  <header className="bg-[linear-gradient(135deg,_#2584eb_80%,_#4fc3f7_100%)] backdrop-blur-md shadow-xl border-b-2 border-blue-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-30" style={{boxShadow:'0 4px 24px 0 rgba(37,99,235,0.10), 0 1.5px 8px 0 rgba(0,0,0,0.08)'}}>
          <div className="flex items-center gap-4">
            {/* Sidebar toggle button always visible */}
            <button
              className="p-2 rounded hover:bg-blue-400/30 focus:outline-none border border-blue-100 bg-white/20 shadow-sm"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {sidebarOpen ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            {!sidebarOpen && (
              <span className="font-semibold text-white text-lg drop-shadow">LIASE</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-blue-100 text-sm inline-flex items-center gap-1"><UserCircleIcon className="w-5 h-5 text-blue-100" />Welcome, User</span>
            <button
              className="bg-white text-primary px-4 py-1.5 rounded hover:bg-blue-100 transition text-sm font-semibold shadow"
              onClick={() => router.push('/login')}
            >
              Logout
            </button>
          </div>
        </header>
        <section className="flex-1 bg-transparent">{children}</section>
      </main>
    </div>
  );
}
