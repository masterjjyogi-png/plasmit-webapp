import {
  Archive,
  Bell,
  ClipboardList,
  LayoutDashboard,
  Scissors,
  UserRoundCheck,
  ScanSearch,
  Search,
  Settings,
} from "lucide-react";

import type { NavigationItem, Role } from "@/types";

export const roles: Role[] = [
  "Super Admin",
  "Hospital Admin",
  "Doctor",
  "Nurse",
  "Receptionist",
  "Lab Technician",
  "Radiologist",
  "Pharmacist",
  "Billing Executive",
  "HR Manager",
  "Management",
];

const allRoles = roles;

export const navigationItems: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, route: "/dashboard", group: "Command", allowedRoles: allRoles, status: "ready" },
  { id: "search", label: "Global Search", icon: Search, route: "/search", group: "Command", allowedRoles: allRoles, status: "ready" },
  { id: "notifications", label: "Notifications", icon: Bell, route: "/notifications", group: "Command", allowedRoles: allRoles, status: "ready" },
  { id: "worklist", label: "Worklist", icon: ClipboardList, route: "/worklist", group: "Nursing", allowedRoles: ["Super Admin", "Hospital Admin", "Doctor", "Nurse", "Management"], status: "ready" },
  { id: "radiology", label: "Radiology", icon: ScanSearch, route: "/radiology", group: "Radiology", allowedRoles: ["Super Admin", "Hospital Admin", "Doctor", "Nurse", "Receptionist", "Radiologist", "Billing Executive", "Management"], status: "ready" },
  { id: "nurse", label: "Nurse", icon: UserRoundCheck, route: "/nurse", group: "Nursing", allowedRoles: ["Super Admin", "Hospital Admin", "Doctor", "Nurse", "Management"], status: "ready" },
  { id: "surgery", label: "Surgery", icon: Scissors, route: "/surgery", group: "Surgery", allowedRoles: ["Super Admin", "Hospital Admin", "Doctor", "Nurse", "Receptionist", "Management"], status: "ready" },
  { id: "settings", label: "UI Settings", icon: Settings, route: "/settings/ui", group: "Command", allowedRoles: allRoles, status: "ready" },
  { id: "preview", label: "Components Preview", icon: Archive, route: "/components-preview", group: "Command", allowedRoles: ["Super Admin", "Hospital Admin"], status: "ready" },
];

export const dashboardQuickActions = [
  { id: "radiology", label: "Open radiology", icon: ScanSearch, route: "/radiology" },
  { id: "radiology-orders", label: "Radiology orders", icon: ScanSearch, route: "/radiology/orders" },
  { id: "radiology-reports", label: "Radiology reports", icon: ScanSearch, route: "/radiology/reports" },
  { id: "radiology-schedule", label: "Radiology schedule", icon: ScanSearch, route: "/radiology/schedule" },
];
