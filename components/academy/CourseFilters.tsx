"use client"

import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Category } from "@/lib/types-academy"
import { FiSearch } from "react-icons/fi"

interface CourseFiltersProps {
  categories: Category[]
  selectedCategoryId?: string
  searchQuery: string
  onCategoryChange: (categoryId: string | undefined) => void
  onSearchChange: (query: string) => void
}

export function CourseFilters({
  categories,
  selectedCategoryId,
  searchQuery,
  onCategoryChange,
  onSearchChange,
}: CourseFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cerca corsi..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Tabs
        value={selectedCategoryId || "all"}
        onValueChange={(value) => onCategoryChange(value === "all" ? undefined : value)}
      >
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">Tutti</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}




