import { Link, useLocation } from "react-router-dom"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { getNavigationItems } from "./navigationItems"

const getItemClassName = ({ active, collapsed }) => {
  const base = `group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
    collapsed ? "justify-center" : ""
  }`

  if (active) {
    return `${base} bg-blue-600 text-white shadow-sm dark:bg-blue-500`
  }

  return `${base} text-gray-700 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white`
}

const SidebarContent = ({ user, collapsed, onNavigate, onToggleCollapse, mobile = false }) => {
  const location = useLocation()
  const items = getNavigationItems(user)

  return (
    <div className="flex h-full flex-col">
      <div className={`flex h-16 items-center border-b border-gray-200 px-4 dark:border-gray-800 ${collapsed && !mobile ? "justify-center" : "justify-between"}`}>
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className={`flex min-w-0 items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${collapsed && !mobile ? "justify-center" : ""}`}
          aria-label="LiteBoard dashboard"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">
            LB
          </div>
          {(!collapsed || mobile) && (
            <span className="truncate text-lg font-bold text-gray-950 dark:text-white">
              LiteBoard
            </span>
          )}
        </Link>

        {mobile && (
          <button
            type="button"
            onClick={onNavigate}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            const active = item.match(location.pathname)

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                title={collapsed && !mobile ? item.label : undefined}
                aria-label={collapsed && !mobile ? item.label : undefined}
                className={getItemClassName({
                  active,
                  collapsed: collapsed && !mobile,
                })}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {!mobile && (
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white ${
              collapsed ? "justify-center" : ""
            }`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </div>
  )
}

const Sidebar = ({ user, collapsed, mobileOpen, onCloseMobile, onToggleCollapse }) => {
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-in-out dark:border-gray-800 dark:bg-gray-950 md:block ${
          collapsed ? "w-20" : "w-[260px]"
        }`}
      >
        <SidebarContent
          user={user}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default bg-gray-950/50"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
          />
          <aside className="relative h-full w-[280px] max-w-[calc(100vw-2rem)] border-r border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
            <SidebarContent user={user} collapsed={false} mobile onNavigate={onCloseMobile} />
          </aside>
        </div>
      )}
    </>
  )
}

export default Sidebar
