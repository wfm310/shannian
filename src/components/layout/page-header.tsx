import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Search, Plus } from "lucide-react"
import { UserAvatar } from "@/components/layout/user-avatar"


interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
  divider?: boolean

  searchEnabled?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string

  createEnabled?: boolean
  onCreate?: () => void

  avatarEnabled?: boolean
}


export function PageHeader({
  title,
  description,
  actions,
  children,
  className,
  divider = true,
  searchEnabled = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "搜索...",
  createEnabled = false,
  onCreate,
  avatarEnabled = true,
}: PageHeaderProps) {
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSearching) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isSearching])

  const handleTitleClick = () => {
    if (searchEnabled) {
      setIsSearching(true)
    }
  }

  const handleCancelSearch = () => {
    setIsSearching(false)
    onSearchChange?.("")
  }

  const hasRightContent = createEnabled || actions || avatarEnabled

  return (
    <div
      className={cn(
        "sticky top-0 z-40 bg-background/70 backdrop-blur-xl px-5",
        className
      )}
    >
      {/* 安全区占位 */}
      <div className="flex-shrink-0" style={{ height: "env(safe-area-inset-top)" }} />

      {/* === 搜索模式 === */}
      {isSearching ? (
        <div className="min-h-[44px] flex items-center gap-3 py-2">
          <div className="flex-1 flex items-center h-11 bg-secondary/20 rounded-xl px-3">
            <Search className="size-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 ml-2 bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
            />
          </div>
          <button
            onClick={handleCancelSearch}
            className="shrink-0 text-sm font-medium text-foreground active:opacity-60 transition-opacity"
          >
            取消
          </button>
        </div>
      ) : (
        /* === 标准模式：Title 1 === */
        <div className="min-h-[60px] flex items-center justify-between gap-4 pt-3">
          <div
            className={cn("min-w-0 flex-1", searchEnabled && "cursor-pointer")}
            onClick={searchEnabled ? handleTitleClick : undefined}
          >
            <h1 className="text-[28px] font-bold leading-[1.21] tracking-[0.013em] truncate">
              {title}
            </h1>
            {description && (
              <p className="text-[15px] font-normal leading-[1.33] tracking-[-0.005em] text-muted-foreground mt-1 truncate">
                {description}
              </p>
            )}
          </div>

          {hasRightContent && (
            <div className="flex items-center gap-2 shrink-0">
              {createEnabled && (
                <button
                  onClick={onCreate}
                  className="size-11 flex items-center justify-center active:opacity-60 rounded-xl transition-opacity"
                  aria-label="新建"
                >
                  <Plus className="size-5 text-foreground" strokeWidth={1.5} />
                </button>
              )}
              {actions}
              {avatarEnabled && <UserAvatar />}
            </div>
          )}
        </div>
      )}

      {/* 底部内容区 */}
      {children && !isSearching && (
        <div className="pt-4 pb-3">
          {children}
        </div>
      )}

      {/* 分隔线 */}
      {divider && !isSearching && (
        <div className="h-px bg-border/30 -mx-5" />
      )}
    </div>
  )
}
