"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { FiMenu, FiX, FiLogOut, FiMessageSquare, FiUser, FiMessageCircle, FiSettings, FiBookOpen, FiPlay } from "react-icons/fi"
import { FaTrophy } from "react-icons/fa"

const Header = () => {
  const { user, logout } = useAuth()
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
    { href: "/bacheca", label: "Bacheca", icon: <FiMessageSquare /> },
    { href: "/academy", label: "Academy", icon: <FiBookOpen /> },
    { href: "/area-riservata/live", label: "Eventi Live", icon: <FiPlay /> },
    { href: "/neurocredits", label: "NeuroCredits", icon: <FaTrophy /> },
    { href: "/area-riservata/profile", label: "Profilo", icon: <FiUser /> },
  ]

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
              <h1 className="text-xl font-black text-gradient">BRAIN HACKING ACADEMY</h1>
              <p className="text-xs text-gray-400 font-medium">Hackera mente e comportamento umano</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center space-x-2 text-gray-300 hover:text-[#005FD7] transition-colors"
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {user.isAdmin && (
                  <Link
                    href="/admin/users"
                    className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
                  >
                    <FiSettings />
                    <span>Admin</span>
                  </Link>
                )}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#005FD7] rounded-full flex items-center justify-center">
                    <span className="font-bold">{getUserInitial()}</span>
                  </div>
                  <div>
                    <p className="font-medium">{user.nickname || user.email || "Utente"}</p>
                    <p className="text-xs text-gray-400">Livello {getUserLevel()}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FiLogOut />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="px-4 py-2 text-gray-300 hover:text-white transition-colors">
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="px-6 py-2 bg-[#005FD7] hover:bg-[#0051b8] rounded-lg font-medium transition-all"
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
          <div className="md:hidden mt-4 pb-4 border-t border-gray-800 pt-4">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center space-x-3 text-gray-300 hover:text-[#005FD7] py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              ))}

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
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-[#005FD7] rounded-full flex items-center justify-center shadow-lg">
                        <span className="font-bold">{getUserInitial()}</span>
                      </div>
                      <div>
                        <p className="font-medium">{user.nickname || user.email || "Utente"}</p>
                        <p className="text-sm text-gray-400">Livello {getUserLevel()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        logout()
                        setIsMenuOpen(false)
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg"
                    >
                      <FiLogOut />
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
