"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { FiMenu, FiX, FiLogOut, FiUser, FiSettings } from "react-icons/fi"
import { Trophy, ChevronDown, LogOut, User, Settings } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const Header = () => {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { href: "/area-riservata/dashboard", label: "Dashboard", icon: <FiSettings /> },
    { href: "/area-riservata/profile", label: "Profilo", icon: <FiUser /> },
  ]

  const isActiveLink = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }
    return pathname?.startsWith(href)
  }

  const getUserInitial = () => {
    if (!user?.nickname && !user?.email) return "U"
    const name = user.nickname || user.email || "Utente"
    return name.charAt(0).toUpperCase()
  }

  const getUserLevel = () => {
    if (!user?.pointsTotal) return 1
    return Math.floor(user.pointsTotal / 1000) + 1
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? "glass-effect shadow-2xl" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-[#005FD7] rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:scale-110 transition-all">
              <span className="text-white font-bold text-xl">BHA</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#005FD7]">BRAIN HACKING</h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => {
              const isActive = isActiveLink(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 transition-all duration-200 relative ${
                    isActive
                      ? "text-[#005FD7] font-semibold"
                      : "text-gray-300 hover:text-[#005FD7]"
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#005FD7] rounded-full" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#005FD7]/50">
                      <Avatar className="h-10 w-10 border-2 border-[#005FD7]/30 shadow-md">
                        <AvatarImage src={user.avatarUrl} alt={user.nickname || user.email} />
                        <AvatarFallback className="bg-gradient-to-br from-[#005FD7] to-[#0051b8] text-white font-semibold">
                          {getUserInitial()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-semibold text-white">
                          {user.nickname || user.email?.split("@")[0] || "Utente"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Trophy className="h-3 w-3 text-yellow-400" />
                          <span className="text-xs text-gray-400">Livello {getUserLevel()}</span>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-800">
                    <DropdownMenuLabel className="px-3 py-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium text-white">
                          {user.nickname || user.email?.split("@")[0] || "Utente"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-800" />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/area-riservata/profile"
                        className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white hover:bg-gray-800"
                      >
                        <User className="h-4 w-4" />
                        <span>Profilo</span>
                      </Link>
                    </DropdownMenuItem>
                    {user.isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/admin/users"
                          className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white hover:bg-gray-800"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Pannello Admin</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-gray-800" />
                    <DropdownMenuItem
                      onClick={logout}
                      className="flex items-center gap-2 cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-950/20 focus:text-red-300 focus:bg-red-950/20"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="px-6 py-2 bg-gradient-to-r from-[#005FD7] to-[#0051b8] hover:from-[#0051b8] hover:to-[#0047a3] rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  Registrati
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-800 pt-4 animate-fade-in-up">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => {
                const isActive = isActiveLink(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-3 py-2 transition-all ${
                      isActive
                        ? "text-[#005FD7] font-semibold bg-[#005FD7]/10 rounded-lg px-3"
                        : "text-gray-300 hover:text-[#005FD7]"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                )
              })}

              <div className="pt-4 border-t border-gray-800">
                {user ? (
                  <>
                    {user.isAdmin && (
                      <Link
                        href="/admin/users"
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg mb-3 font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <FiSettings />
                        <span>Pannello Admin</span>
                      </Link>
                    )}
                    <div className="flex items-center gap-3 mb-4 p-3 bg-gray-800/50 rounded-lg">
                      <Avatar className="h-12 w-12 border-2 border-[#005FD7]/30 shadow-md">
                        <AvatarImage src={user.avatarUrl} alt={user.nickname || user.email} />
                        <AvatarFallback className="bg-gradient-to-br from-[#005FD7] to-[#0051b8] text-white font-semibold">
                          {getUserInitial()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{user.nickname || user.email?.split("@")[0] || "Utente"}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                          <span className="text-xs text-gray-400">Livello {getUserLevel()}</span>
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/area-riservata/profile"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors mb-3"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      <span>Profilo</span>
                    </Link>
                    {user.isAdmin && (
                      <Link
                        href="/admin/users"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg mb-3 font-medium transition-all"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Pannello Admin</span>
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout()
                        setIsMenuOpen(false)
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/30 hover:bg-red-950/50 text-red-400 rounded-lg transition-colors border border-red-900/50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col space-y-3">
                    <Link
                      href="/auth/login"
                      className="w-full text-center py-3 border border-gray-700 hover:border-[#005FD7] rounded-lg"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth/register"
                      className="w-full text-center py-3 bg-[#005FD7] hover:bg-[#0051b8] rounded-lg"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Registrati
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
