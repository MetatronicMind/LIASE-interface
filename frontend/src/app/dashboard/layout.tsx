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
  ArchiveBoxIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/components/PermissionProvider";
import ClientSelector from "@/components/ClientSelector";
import { auditService } from "@/services/auditService";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import TriChannelSidebar from "@/components/TriChannelSidebar";

// Base navigation items - always visible
const baseNavItems: any[] = [];

// Permission-based navigation items
const permissionBasedNavItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: <HomeIcon className="w-5 h-5 mr-2" />,
    permission: { resource: 'dashboard', action: 'read' }
  },
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
    name: "No Case Allocation",
    href: "/dashboard/no-case-allocation",
    icon: <XCircleIcon className="w-5 h-5 mr-2" />,
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
    name: "AOI Allocation",
    href: "/dashboard/aoi-allocation",
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
  const isSidebarLocked = useSelector((state: RootState) => state.ui.isSidebarLocked);

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
        {/* Tri-Channel Sidebar */}
        <TriChannelSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black bg-opacity-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        {/* Main Content */}
        <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-64' : ''} w-full max-w-full`}>
          <header className="bg-[#2563eb] shadow-xl px-6 py-4 flex items-center justify-between sticky top-0 z-30" style={{ boxShadow: '0 4px 24px 0 rgba(37,99,235,0.10), 0 1.5px 8px 0 rgba(0,0,0,0.08)' }}>
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
              {/* <button className="bg-blue-700/40 rounded-full p-2 text-white hover:bg-blue-800/60 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button> */}
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
                    {/* <button
                    className="block w-full text-left px-4 py-2 text-blue-900 hover:bg-blue-50 font-semibold"
                    onClick={() => {
                      setUserMenuOpen(false);
                      router.push('/dashboard/profile');
                    }}
                  >
                    Profile
                  </button> */}
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
