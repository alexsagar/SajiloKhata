"use client"

import React, { useState, useRef, useEffect } from "react"
import { Search, Menu, Bell, Settings, LogOut, User, ChevronDown, X, DollarSign, Users, User as UserIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useMobileSidebar } from "@/contexts/mobile-sidebar-context"
import { useNotifications } from "@/contexts/notification-context"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getInitials } from "@/lib/utils"
import { useGlobalSearch, type SearchResult } from "@/hooks/use-global-search"
import { formatCurrency } from "@/lib/utils"

interface HeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  showSearch?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  onMobileMenuToggle?: () => void
}

export function Header({ 
  title, 
  description, 
  actions, 
  showSearch = true,
  searchPlaceholder = "Search expenses, groups, users...",
  onSearch,
  onMobileMenuToggle
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const { toggleSidebar } = useMobileSidebar()
  const { notifications, unreadCount } = useNotifications()
  const { user, logout } = useAuth()
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  const { searchResults, isSearching, performSearch } = useGlobalSearch()

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    performSearch(value)
    onSearch?.(value)
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleSettings = () => {
    router.push('/settings')
  }

  const handleProfile = () => {
    router.push('/settings/profile')
  }

  const handleSearchResultClick = (result: SearchResult) => {
    router.push(result.url)
    setSearchQuery("")
    setIsSearchFocused(false)
  }

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to focus search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        const searchInput = searchRef.current?.querySelector('input')
        searchInput?.focus()
      }
      
      // Escape to close search results
      if (event.key === 'Escape') {
        setIsSearchFocused(false)
        setSearchQuery("")
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'expense':
        return <DollarSign className="h-4 w-4 text-green-400" />
      case 'group':
        return <Users className="h-4 w-4 text-blue-400" />
      case 'user':
        return <UserIcon className="h-4 w-4 text-purple-400" />
      default:
        return <Search className="h-4 w-4 text-gray-400" />
    }
  }

  const getResultTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'expense':
        return 'Expense'
      case 'group':
        return 'Group'
      case 'user':
        return 'User'
      default:
        return 'Result'
    }
  }

  return (
    <header className="sticky top-0 z-40 h-14 sm:h-16 bg-[var(--panel)]/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-white/5">
      <div className="flex items-center h-full px-3 sm:px-4 gap-2 sm:gap-3 py-2">
        {/* Left Section - Mobile Menu & Title */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toggleSidebar()
              onMobileMenuToggle?.() // Call the prop if provided
            }}
            className="lg:hidden h-10 w-10 p-2 flex-shrink-0"
            aria-label="Toggle mobile menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Title */}
          <div className="flex flex-col min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-semibold text-white leading-tight truncate">{title}</h1>
            {description && (
              <p className="text-xs text-slate-400 mt-0.5 truncate hidden sm:block">{description}</p>
            )}
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex items-center gap-2 flex-1 justify-center max-w-md" ref={searchRef}>
          {showSearch && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="w-full pl-9 pr-20 py-2 text-sm bg-white/5 hover:bg-white/7 focus:bg-white/10 focus:ring-2 focus:ring-emerald-400/40 transition-all duration-150 min-h-[40px]"
                aria-label="Search"
              />
              
              {/* Keyboard Shortcut Hint */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
              
              {/* Search Results Dropdown */}
              {isSearchFocused && searchQuery.length > 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--panel)] border border-white/10 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                  <div className="p-3 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">Search Results</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSearchFocused(false)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-2">
                    {isSearching ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400 mx-auto mb-2"></div>
                        <p className="text-sm">Searching...</p>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No results found</p>
                        <p className="text-xs">Try searching for expenses, groups, or users</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {searchResults.map((result, idx) => (
                          <div
                            key={(result as any)?.id || `${result.type}-${result.title}-${idx}`}
                            onClick={() => handleSearchResultClick(result)}
                            className="flex items-center space-x-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                          >
                            <div className="flex-shrink-0">
                              {result.avatar ? (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={result.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(result.title.split(' ')[0] || '', result.title.split(' ')[1] || '')}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                                  {getResultIcon(result.type)}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-white truncate">
                                  {result.title}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {getResultTypeLabel(result.type)}
                                </Badge>
                              </div>
                              {result.description && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {result.description}
                                </p>
                              )}
                              {result.amount && (
                                <p className="text-xs text-emerald-400 mt-1">
                                  {formatCurrency(result.amount, result.currency || 'USD')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="p-3 border-t border-white/10">
                      <p className="text-xs text-muted-foreground text-center">
                        Press Enter to see more results
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section - Notifications + User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative h-10 w-10 p-2 hover:bg-white/10"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.slice(0, 10).map((notification, idx) => (
                      <div
                        key={(notification as any)?.id || (notification as any)?._id || `${notification.title}-${notification.createdAt}-${idx}`}
                        className={`p-3 hover:bg-white/5 transition-colors cursor-pointer ${
                          !notification.read ? 'bg-blue-500/10' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className={`w-2 h-2 rounded-full ${
                              !notification.read ? 'bg-blue-400' : 'bg-gray-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="p-3 border-t border-white/10">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => router.push('/settings/notifications')}
                  >
                    View all notifications
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 h-10 px-3 py-2 hover:bg-white/10"
                aria-label="User menu"
              >
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs font-medium">
                    {user?.avatar ? '👤' : getInitials(user?.firstName || '', user?.lastName || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex items-center space-x-1 min-w-0 flex-1">
                  <span className="text-sm font-medium text-white">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-3 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-blue-500/20 text-blue-400 text-sm font-medium">
                      {user?.avatar ? '👤' : getInitials(user?.firstName || '', user?.lastName || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
              
              <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 hover:text-red-300">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Actions (if provided) */}
          {actions && (
            <div className="flex items-center gap-1 sm:gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
