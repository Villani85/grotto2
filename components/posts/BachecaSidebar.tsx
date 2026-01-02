"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FiAward, FiHeart, FiZap, FiInfo } from "react-icons/fi"

export function BachecaSidebar() {
  return (
    <div className="space-y-4">
      {/* Card Oggi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FiAward className="h-5 w-5" />
            Oggi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Controlla i tuoi progressi e punti NeuroCredits
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/neurocredits">Vai su NeuroCredits</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Card Regole */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FiInfo className="h-5 w-5" />
            Regole rapide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <FiZap className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span className="text-muted-foreground">Condividi valore: post utili e riflessioni</span>
            </li>
            <li className="flex items-start gap-2">
              <FiZap className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span className="text-muted-foreground">No spam: evita contenuti promozionali</span>
            </li>
            <li className="flex items-start gap-2">
              <FiHeart className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span className="text-muted-foreground">Punti dai like: ricevi NeuroCredits quando altri ti mettono like</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}




