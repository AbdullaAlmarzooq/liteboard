import { LogOut, Menu, Moon, Sun } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../../contexts/ThemeContext"

const getUserInitials = (user) => {
  const name = user?.name || user?.email || "User"
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U"
}

const Header = ({ title, user, onOpenMobileMenu }) => {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-gray-950 dark:text-white sm:text-xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden min-w-0 items-center gap-3 border-r border-gray-200 pr-3 dark:border-gray-800 sm:flex">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              {getUserInitials(user)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {user?.name || "User"}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {user?.role_name || user?.role || user?.email || "Authenticated"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-yellow-400" />}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-gray-300 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
