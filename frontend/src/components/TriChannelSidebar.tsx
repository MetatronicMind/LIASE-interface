"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  HomeIcon,
  TableCellsIcon,
  DocumentMagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  Cog6ToothIcon,
  PencilSquareIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
  UserIcon,
  ChartBarIcon,
  BeakerIcon,
  ArchiveBoxIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { usePermissions } from "@/components/PermissionProvider";
import { auditService } from "@/services/auditService";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

// Define interfaces for navigation structure
interface NavPermission {
  resource: string;
  action: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  permission?: NavPermission;
}

interface NavGroup {
  name: string;
  icon: React.ReactNode;
  permission?: NavPermission;
  children: NavItem[];
}

// Tri-Channel Track Navigation Groups
const trackNavGroups: NavGroup[] = [
  {
    name: "ICSR Track",
    icon: <DocumentCheckIcon className="w-5 h-5" />,
    permission: { resource: "icsr_track", action: "read" },
    children: [
      {
        name: "ICSR Triage",
        href: "/dashboard/icsr/triage",
        icon: <DocumentMagnifyingGlassIcon className="w-4 h-4" />,
        permission: { resource: "triage", action: "read" },
      },
      {
        name: "Assessment",
        href: "/dashboard/icsr/assessment",
        icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
        permission: { resource: "QC", action: "read" },
      },
    ],
  },
  {
    name: "AOI Track",
    icon: <BeakerIcon className="w-5 h-5" />,
    permission: { resource: "aoi_track", action: "read" },
    children: [
      {
        name: "AOI QC",
        href: "/dashboard/aoi/triage",
        icon: <DocumentMagnifyingGlassIcon className="w-4 h-4" />,
        permission: { resource: "triage", action: "read" },
      },
      {
        name: "AOI Assessment",
        href: "/dashboard/aoi/assessment",
        icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
        permission: { resource: "aoiAssessment", action: "read" },
      },
    ],
  },
  {
    name: "No Case Track",
    icon: <XCircleIcon className="w-5 h-5" />,
    permission: { resource: "no_case_track", action: "read" },
    children: [
      {
        name: "No Case QC",
        href: "/dashboard/no-case/triage",
        icon: <DocumentMagnifyingGlassIcon className="w-4 h-4" />,
        permission: { resource: "triage", action: "read" },
      },
      {
        name: "No Case Assessment",
        href: "/dashboard/no-case/assessment",
        icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
        permission: { resource: "QC", action: "read" },
      },
    ],
  },
];

// Top navigation items (before tracks)
const topNavItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: <HomeIcon className="w-5 h-5" />,
    permission: { resource: "dashboard", action: "read" },
  },
  {
    name: "Literature Search Configuration",
    href: "/dashboard/drug-management",
    icon: <BeakerIcon className="w-5 h-5" />,
    permission: { resource: "drugs", action: "read" },
  },
];

// Unified downstream navigation items (after tracks)
const downstreamNavItems: NavItem[] = [
  {
    name: "Data Entry",
    href: "/dashboard/data-entry",
    icon: <PencilSquareIcon className="w-5 h-5" />,
    permission: { resource: "data_entry", action: "read" },
  },
  {
    name: "QC Data Entry",
    href: "/dashboard/qc",
    icon: <DocumentCheckIcon className="w-5 h-5" />,
    permission: { resource: "QC", action: "read" },
  },
  {
    name: "Medical Review",
    href: "/dashboard/medical-examiner",
    icon: <UserIcon className="w-5 h-5" />,
    permission: { resource: "medical_examiner", action: "read" },
  },
  {
    name: "ICSR Reports",
    href: "/dashboard/full-report",
    icon: <DocumentCheckIcon className="w-5 h-5" />,
    permission: { resource: "reports", action: "read" },
  },
  {
    name: "AOI Reports",
    href: "/dashboard/aoi-reports",
    icon: <DocumentCheckIcon className="w-5 h-5" />,
    permission: { resource: "reports", action: "read" },
  },
  {
    name: "No Case Reports",
    href: "/dashboard/no-case-reports",
    icon: <DocumentCheckIcon className="w-5 h-5" />,
    permission: { resource: "reports", action: "read" },
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: <ChartBarIcon className="w-5 h-5" />,
    permission: { resource: "reports", action: "read" },
  },
];

// Bottom navigation items (settings, etc.)
const bottomNavItems: NavItem[] = [
  {
    name: "Audit Trail",
    href: "/dashboard/audit-trail",
    icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
    permission: { resource: "audit", action: "read" },
  },
  {
    name: "User Management",
    href: "/dashboard/user-management",
    icon: <UsersIcon className="w-5 h-5" />,
    permission: { resource: "users", action: "read" },
  },
  {
    name: "Legacy Data",
    href: "/dashboard/legacy-data",
    icon: <TableCellsIcon className="w-5 h-5" />,
    permission: { resource: "legacyData", action: "read" },
  },
  {
    name: "Archive",
    href: "/dashboard/archive",
    icon: <ArchiveBoxIcon className="w-5 h-5" />,
    permission: { resource: "archive", action: "read" },
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: <Cog6ToothIcon className="w-5 h-5" />,
    permission: { resource: "settings", action: "read" },
  },
];

interface TriChannelSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function TriChannelSidebar({
  sidebarOpen,
  setSidebarOpen,
}: TriChannelSidebarProps) {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();
  const isSidebarLocked = useSelector(
    (state: RootState) => state.ui.isSidebarLocked,
  );

  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      "ICSR Track": true,
      "AOI Track": false,
      "No Case Track": false,
    },
  );

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Check if user has permission for an item
  const checkPermission = (item: NavItem | NavGroup) => {
    if (!item.permission) return true;
    return hasPermission(item.permission.resource, item.permission.action);
  };

  // Filter nav items based on permissions
  const filterItems = <T extends NavItem | NavGroup>(items: T[]): T[] => {
    return items.filter(checkPermission);
  };

  // Check if any child in a group is active
  const isGroupActive = (group: NavGroup) => {
    return group.children.some((child) => pathname === child.href);
  };

  const renderNavItem = (item: NavItem) => (
    <Link
      href={isSidebarLocked ? "#" : item.href}
      aria-disabled={isSidebarLocked}
      className={`flex items-center px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ease-out gap-2
        ${
          isSidebarLocked
            ? "opacity-50 cursor-not-allowed"
            : "hover:scale-[1.02] active:scale-95"
        }
        ${
          pathname === item.href
            ? "bg-gradient-to-r from-blue-100/80 to-blue-300/60 text-blue-900 font-bold shadow-inner"
            : isSidebarLocked
              ? "text-blue-100"
              : "text-blue-100 hover:bg-gradient-to-r hover:from-blue-200/60 hover:to-blue-400/40 hover:text-blue-900"
        }
      `}
      onClick={(e) => {
        if (isSidebarLocked) {
          e.preventDefault();
          return;
        }
        if (window.innerWidth < 1024) setSidebarOpen(false);
        auditService.createLog({
          action: "view",
          resource: "navigation",
          details: `Clicked on ${item.name}`,
        });
      }}
    >
      <span className="mr-1">{item.icon}</span>
      <span className="truncate">{item.name}</span>
    </Link>
  );

  const renderNavGroup = (group: NavGroup) => {
    const isExpanded = expandedGroups[group.name];
    const isActive = isGroupActive(group);
    // If the group has its own permission gate (e.g. icsr_track.read),
    // show all children — the group permission is the access gate.
    // Otherwise filter children individually.
    const visibleChildren = group.permission
      ? group.children
      : group.children.filter(checkPermission);

    if (visibleChildren.length === 0) return null;

    return (
      <div key={group.name} className="mb-1">
        <button
          onClick={() => toggleGroup(group.name)}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ease-out
            ${
              isActive
                ? "bg-blue-600/30 text-white"
                : "text-blue-100 hover:bg-blue-600/20"
            }
          `}
        >
          <div className="flex items-center gap-2">
            {group.icon}
            <span>{group.name}</span>
          </div>
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </button>

        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1 border-l-2 border-blue-400/30 pl-2">
            {visibleChildren.map((child) => (
              <div key={child.href}>{renderNavItem(child)}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`fixed z-40 top-0 left-0 h-full w-64 flex flex-col py-8 px-4 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} bg-[#1856a5] shadow-2xl`}
      style={{
        minWidth: "16rem",
        boxShadow:
          "0 8px 32px 0 rgba(37,99,235,0.18), 0 1.5px 8px 0 rgba(0,0,0,0.08)",
      }}
    >
      {/* Logo */}
      <div className="mb-8 text-center flex justify-center">
        <div
          className="inline-block px-4 py-3 rounded-xl"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)",
            boxShadow:
              "0 4px 24px 0 rgba(255,255,255,0.10), 0 1.5px 8px 0 rgba(0,0,0,0.08)",
            border: "1.5px solid rgba(255,255,255,0.25)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-blue-400/50 scrollbar-track-blue-900/20 hover:scrollbar-thumb-blue-300/70">
        {/* Top Navigation Items */}
        <ul className="space-y-1 mb-4">
          {filterItems(topNavItems).map((item) => (
            <li key={item.name}>{renderNavItem(item)}</li>
          ))}
        </ul>

        {/* Divider */}
        <div className="border-t border-blue-400/30 my-4" />

        {/* Track Groups Section Header */}
        <div className="px-4 mb-2">
          <span className="text-xs font-bold text-blue-200/70 uppercase tracking-wider">
            Workflow Tracks
          </span>
        </div>

        {/* Track Navigation Groups */}
        <div className="space-y-1 mb-4">
          {filterItems(trackNavGroups).map((group) => renderNavGroup(group))}
        </div>

        {/* Divider */}
        <div className="border-t border-blue-400/30 my-4" />

        {/* Downstream Section Header */}
        <div className="px-4 mb-2">
          <span className="text-xs font-bold text-blue-200/70 uppercase tracking-wider">
            Processing
          </span>
        </div>

        {/* Downstream Navigation Items */}
        <ul className="space-y-1 mb-4">
          {filterItems(downstreamNavItems).map((item) => (
            <li key={item.name}>{renderNavItem(item)}</li>
          ))}
        </ul>

        {/* Divider */}
        <div className="border-t border-blue-400/30 my-4" />

        {/* Bottom Navigation Items */}
        <ul className="space-y-1">
          {filterItems(bottomNavItems).map((item) => (
            <li key={item.name}>{renderNavItem(item)}</li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-blue-100">
        © {new Date().getFullYear()} LIASE
        {process.env.NEXT_PUBLIC_APP_VERSION && (
          <div className="mt-1 font-mono opacity-70">
            {process.env.NEXT_PUBLIC_APP_VERSION}
          </div>
        )}
      </div>
    </aside>
  );
}
