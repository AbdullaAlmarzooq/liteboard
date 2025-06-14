export const Card = ({ children, className = "", hover = false }) => {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${
        hover ? "hover:shadow-md transition-shadow" : ""
      } ${className}`}
    >
      {children}
    </div>
  )
}

export const CardHeader = ({ children, className = "" }) => {
  return <div className={`p-6 pb-4 ${className}`}>{children}</div>
}

export const CardContent = ({ children, className = "" }) => {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>
}

export const CardTitle = ({ children, className = "" }) => {
  return (
    <h3
      className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}
    >
      {children}
    </h3>
  )
}
