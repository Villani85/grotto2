"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Filter, Sparkles } from "lucide-react"
import type { PostType } from "./PostComposerV2"

interface BachecaFiltersProps {
  selectedType?: PostType | "all"
  onTypeChange?: (type: PostType | "all") => void
}

export function BachecaFilters({ selectedType = "all", onTypeChange }: BachecaFiltersProps) {
  const types: Array<{ key: PostType | "all"; label: string; color: string }> = [
    { key: "all", label: "Tutti", color: "bg-gray-500" },
    { key: "insight", label: "Insight", color: "bg-blue-500" },
    { key: "challenge", label: "Challenge", color: "bg-purple-500" },
    { key: "domanda", label: "Domanda", color: "bg-orange-500" },
  ]

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtri
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {types.map((type) => (
          <Button
            key={type.key}
            variant={selectedType === type.key ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            onClick={() => onTypeChange?.(type.key)}
          >
            <Badge
              variant="outline"
              className={`mr-2 ${type.color} border-0 w-2 h-2 p-0 rounded-full`}
            />
            {type.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
