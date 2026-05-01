import {
  ClipboardList,
  FilePlus,
  FolderOpen,
  LayoutDashboard,
  ScrollText,
  Settings,
  UserCircle,
} from "lucide-react"

export const SIDEBAR_STORAGE_KEY = "liteboard.sidebarCollapsed"

export const getNavigationItems = (user) => {
  const roleId = Number(user?.role_id)
  const canCreateTicket = roleId === 1 || roleId === 2
  const isAdmin = roleId === 1

  const items = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      match: (pathname) => pathname === "/" || pathname === "/dashboard",
    },
    {
      path: "/tickets",
      label: "Tickets",
      icon: ClipboardList,
      match: (pathname) =>
        pathname === "/tickets" ||
        pathname.startsWith("/view-ticket") ||
        pathname.startsWith("/edit-ticket"),
    },
    {
      path: "/projects",
      label: "Projects",
      icon: FolderOpen,
      match: (pathname) => pathname === "/projects",
    },
  ]

  if (canCreateTicket) {
    items.push({
      path: "/create-ticket",
      label: "Create Ticket",
      icon: FilePlus,
      match: (pathname) => pathname === "/create-ticket",
    })
  }

  if (isAdmin) {
    items.push({
      path: "/admin/logs",
      label: "Audit Logs",
      icon: ScrollText,
      match: (pathname) => pathname === "/admin/logs",
    })

    items.push({
      path: "/admin",
      label: "Admin Panel",
      icon: Settings,
      match: (pathname) => pathname === "/admin",
    })
  }

  items.push({
    path: "/profile",
    label: "Profile",
    icon: UserCircle,
    match: (pathname) => pathname === "/profile",
  })

  return items
}

export const getPageTitle = (pathname) => {
  if (pathname === "/" || pathname === "/dashboard") return "Dashboard"
  if (pathname === "/tickets") return "Tickets"
  if (pathname === "/projects") return "Projects"
  if (pathname === "/create-ticket") return "Create Ticket"
  if (pathname === "/profile") return "Profile"
  if (pathname === "/admin/logs") return "Audit Logs"
  if (pathname === "/admin") return "Admin Panel"
  if (pathname.startsWith("/view-ticket")) return "Ticket Details"
  if (pathname.startsWith("/edit-ticket")) return "Edit Ticket"
  return "LiteBoard"
}
