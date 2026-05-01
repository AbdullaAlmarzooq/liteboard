import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import Header from "./Header"
import Sidebar from "./Sidebar"
import { getPageTitle, SIDEBAR_STORAGE_KEY } from "./navigationItems"

const readStoredCollapsedState = () => {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

const AppLayout = ({ children }) => {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readStoredCollapsedState)
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const isLogin = location.pathname === "/login"

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed))
    } catch {
      // Ignore storage failures so navigation still works.
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  if (isLogin) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900 transition-colors dark:bg-gray-900 dark:text-white">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 transition-colors dark:bg-gray-900 dark:text-white">
      <Sidebar
        user={user}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
      />
      <div
        className={`min-h-screen transition-[padding] duration-200 ease-in-out ${
          sidebarCollapsed ? "md:pl-20" : "md:pl-[260px]"
        }`}
      >
        <Header
          title={getPageTitle(location.pathname)}
          user={user}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout
