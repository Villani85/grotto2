import type React from "react"
import Link from "next/link"
import { Users, BookOpen, Settings, Mail, Shield, Radio, Calendar } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <aside className="w-full md:w-64 shrink-0">
        <div className="bg-card border border-border rounded-lg p-4 sticky top-4">
          <h2 className="font-bold mb-4 text-lg">Admin Panel</h2>
          <nav className="space-y-1">
            <Link
              href="/admin/users"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Users className="h-4 w-4" />
              Utenti
            </Link>
            <Link
              href="/admin/courses"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Corsi
            </Link>
            <Link
              href="/admin/newsletter"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Mail className="h-4 w-4" />
              Newsletter
            </Link>
            <Link
              href="/admin/live"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Radio className="h-4 w-4" />
              Diretta
            </Link>
            <Link
              href="/admin/live-events"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Calendar className="h-4 w-4" />
              Eventi Live
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              Impostazioni
            </Link>
            <Link
              href="/admin/make-all-admin"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-yellow-600 dark:text-yellow-400"
            >
              <Shield className="h-4 w-4" />
              Rendi Tutti Admin
            </Link>
          </nav>
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
