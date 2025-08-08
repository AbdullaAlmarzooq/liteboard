const Badge = ({ children, variant = "default", className = "" }) => {
  const baseClasses =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
  const variantClasses = {
    default: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    secondary: "bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200",
    outline: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    destructive: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  }
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
export default Badge