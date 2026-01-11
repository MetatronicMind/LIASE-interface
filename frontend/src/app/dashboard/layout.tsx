"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  HomeIcon,
  TableCellsIcon,
  DocumentMagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  PencilSquareIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
  UserIcon,
  ChartBarIcon,
  BeakerIcon,
  ArchiveBoxIcon
} from "@heroicons/react/24/outline";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/components/PermissionProvider";
import ClientSelector from "@/components/ClientSelector";
import { auditService } from "@/services/auditService";

// Base navigation items - always visible
const baseNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: <HomeIcon className="w-5 h-5 mr-2" />, permission: null },
];

// Permission-based navigation items
const permissionBasedNavItems = [
  { 
    name: "Literature Search Configuration", 
    href: "/dashboard/drug-management", 
    icon: <BeakerIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'drugs', action: 'read' } 
  },
  { 
    name: "Literature Triage", 
    href: "/dashboard/triage", 
    icon: <DocumentMagnifyingGlassIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'triage', action: 'read' } 
  },
  { 
    name: "QC Allocation", 
    href: "/dashboard/qa", 
    icon: <CheckCircleIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'QA', action: 'read' } 
  },
  { 
    name: "QC Triage Page", 
    href: "/dashboard/qc-triage", 
    icon: <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'QC', action: 'read' } 
  },
  { 
    name: "Data Entry", 
    href: "/dashboard/data-entry", 
    icon: <PencilSquareIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'data_entry', action: 'read' } 
  },
  { 
    name: "QC Data Entry", 
    href: "/dashboard/qc", 
    icon: <DocumentCheckIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'QC', action: 'read' } 
  },
  { 
    name: "Medical Review", 
    href: "/dashboard/medical-examiner", 
    icon: <UserIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'medical_examiner', action: 'read' } 
  },
  { 
    name: "ICSR Reports", 
    href: "/dashboard/full-report", 
    icon: <DocumentCheckIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'reports', action: 'read' } 
  },
  { 
    name: "AOI Assessment", 
    href: "/dashboard/aoi-assessment", 
    icon: <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'aoiAssessment', action: 'read' } 
  },
  { 
    name: "Reports", 
    href: "/dashboard/reports", 
    icon: <ChartBarIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'reports', action: 'read' } 
  },
  { 
    name: "Audit Trail", 
    href: "/dashboard/audit-trail", 
    icon: <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'audit', action: 'read' } 
  },
  { 
    name: "User Management", 
    href: "/dashboard/user-management", 
    icon: <UsersIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'users', action: 'read' } 
  },
  { 
    name: "Legacy Data", 
    href: "/dashboard/legacy-data", 
    icon: <TableCellsIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'legacyData', action: 'read' }
  },
  { 
    name: "Archive", 
    href: "/dashboard/archive", 
    icon: <ArchiveBoxIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'archive', action: 'read' } 
  },
  { 
    name: "Settings", 
    href: "/dashboard/settings", 
    icon: <Cog6ToothIcon className="w-5 h-5 mr-2" />, 
    permission: { resource: 'settings', action: 'read' } 
  },
];

// Function to get nav items based on user permissions
const getNavItemsForUser = (hasPermission: (resource: string, action: string) => boolean, isAdmin: () => boolean, isSuperAdmin: () => boolean) => {
  const filteredItems = permissionBasedNavItems.filter(item => {
    // Check special admin requirements
    if ('requireSuperAdmin' in item && item.requireSuperAdmin && !isSuperAdmin()) return false;
    if ('requireAdmin' in item && item.requireAdmin && !isAdmin()) return false;
    
    // Check permission requirement
    if (item.permission) {
      return hasPermission(item.permission.resource, item.permission.action);
    }
    
    return true;
  });
  
  return [...baseNavItems, ...filteredItems];
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Sidebar open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, logout } = useAuth();
  const { hasPermission, isAdmin, isSuperAdmin } = usePermissions();
  
  // Get navigation items based on user permissions
  const navItems = getNavItemsForUser(hasPermission, isAdmin, isSuperAdmin);
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

  // Close dropdown on outside click or ESC
  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [userMenuOpen]);
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex bg-[#f5f8fb]">
      {/* Sidebar */}
      <aside
        className={`fixed z-40 top-0 left-0 h-full w-64 flex flex-col py-8 px-4 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-[#1856a5] shadow-2xl`}
        style={{ minWidth: '16rem', boxShadow: '0 8px 32px 0 rgba(37,99,235,0.18), 0 1.5px 8px 0 rgba(0,0,0,0.08)' }}
      >
        <div className="mb-10 text-center flex justify-center">
          <div
            className="inline-block px-4 py-3 rounded-xl"
            style={{
              background: 'linear-gradient(120deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
              boxShadow: '0 4px 24px 0 rgba(255,255,255,0.10), 0 1.5px 8px 0 rgba(0,0,0,0.08)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              WebkitBoxShadow: '0 4px 24px 0 rgba(255,255,255,0.10), 0 1.5px 8px 0 rgba(0,0,0,0.08)'
            }}
          >
            <Image 
              src="/logo_white.png" 
              alt="LIASE Logo" 
              width={140} 
              height={60}
              priority
            />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-blue-400/50 scrollbar-track-blue-900/20 hover:scrollbar-thumb-blue-300/70">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg font-semibold text-base transition-all duration-200 ease-out hover:scale-105 hover:-translate-y-1 active:scale-95 gap-2
                    ${pathname === item.href
                      ? 'bg-gradient-to-r from-blue-100/80 to-blue-300/60 text-blue-900 font-bold shadow-inner'
                      : 'text-blue-100 hover:bg-gradient-to-r hover:from-blue-200/60 hover:to-blue-400/40 hover:text-blue-900'}
                  `}
                  style={{ willChange: 'transform' }}
                  onClick={() => {
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                    auditService.createLog({
                      action: 'view',
                      resource: 'navigation',
                      details: `Clicked on ${item.name}`
                    });
                  }}
                >
                  {item.icon}
                  <span>{item.name}</span>
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
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-64' : ''} w-full max-w-full`}>
        <header className="bg-[#2563eb] shadow-xl px-6 py-4 flex items-center justify-between sticky top-0 z-30" style={{boxShadow:'0 4px 24px 0 rgba(37,99,235,0.10), 0 1.5px 8px 0 rgba(0,0,0,0.08)'}}>
          <div className="flex items-center gap-4">
            <button
              className="text-white focus:outline-none"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <ClientSelector />
          </div>
          <div className="flex items-center gap-4">
            <button className="bg-blue-700/40 rounded-full p-2 text-white hover:bg-blue-800/60 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="relative" ref={userMenuRef}>
              <button
                className="inline-flex items-center gap-2 bg-blue-700/40 rounded-full px-4 py-2 text-white font-semibold text-base focus:outline-none"
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <UserCircleIcon className="w-6 h-6" />
                <span>{user?.firstName || 'User'}</span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-blue-100 shadow-lg rounded py-2 z-50 animate-fade-in">
                  <button
                    className="block w-full text-left px-4 py-2 text-blue-900 hover:bg-blue-50 font-semibold"
                    onClick={() => {
                      setUserMenuOpen(false);
                      router.push('/dashboard/profile');
                    }}
                  >
                    Profile
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 font-semibold"
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await logout();
                      router.push('/login');
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <section className="flex-1 bg-transparent">{children}</section>
      </main>
    </div>
    </ProtectedRoute>
  );
}
