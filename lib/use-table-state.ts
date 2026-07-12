import { useMemo, useState } from 'react'

export type SortDirection = 'asc' | 'desc' | null

export interface SortConfig<T> {
  key: string | null
  direction: SortDirection
}

export interface UseTableStateOptions<T> {
  data: T[]
  initialPageSize?: number
  initialSort?: { key: string | null; direction: SortDirection }
  searchKeys?: (item: T) => string[]
  filterFields?: {
    key: keyof T | string
    label: string
    options: { value: string; label: string }[]
    getValue: (item: T) => string
  }[]
}

export interface UseTableStateResult<T> {
  search: string
  setSearch: (value: string) => void
  filters: Record<string, string>
  setFilter: (key: string, value: string) => void
  resetFilters: () => void
  sort: SortConfig<T>
  toggleSort: (key: string) => void
  sortedAndFiltered: T[]
  page: number
  setPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  totalPages: number
  totalItems: number
  paginated: T[]
  selected: Set<string>
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  selectAllOnPage: () => void
  selectAllFiltered: () => void
  clearSelection: () => void
  selectedIds: string[]
  selectedCount: number
  isAllSelected: boolean
  isSomeSelected: boolean
  isAllFilteredSelected: boolean
  isSomeFilteredSelected: boolean
  range: { start: number; end: number }
}

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_SEARCH_KEYS: <T>(item: T) => string[] = () => []

export function useTableState<T extends { id: string | number }>({
  data,
  initialPageSize = DEFAULT_PAGE_SIZE,
  initialSort = { key: null, direction: null },
  searchKeys = DEFAULT_SEARCH_KEYS,
  filterFields = [],
}: UseTableStateOptions<T>): UseTableStateResult<T> {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<SortConfig<T>>(initialSort)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    let result = data

    if (search.trim()) {
      const term = search.toLowerCase().trim()
      result = result.filter((item) =>
        searchKeys(item).some((value) => value.toLowerCase().includes(term))
      )
    }

    for (const field of filterFields) {
      const active = filters[field.key as string]
      if (active && active !== 'all') {
        result = result.filter((item) => field.getValue(item) === active)
      }
    }

    return result
  }, [data, search, searchKeys, filterFields, filters])

  const sorted = useMemo(() => {
    if (!sort.key || !sort.direction) return filtered

    const key = sort.key as string
    const dir = sort.direction === 'asc' ? 1 : -1

    return [...filtered].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[key]
      const bVal = (b as Record<string, unknown>)[key]

      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * dir
      }

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      return aStr.localeCompare(bStr) * dir
    })
  }, [filtered, sort])

  const totalItems = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const safePage = Math.min(page, totalPages)
  if (safePage !== page) {
    setPage(safePage)
  }

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, safePage, pageSize])

  const range = useMemo(() => {
    const start = (safePage - 1) * pageSize + 1
    const end = Math.min(safePage * pageSize, totalItems)
    return { start: totalItems === 0 ? 0 : start, end }
  }, [safePage, pageSize, totalItems])

  function toggleSort(key: string) {
    setSort((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' }
        if (prev.direction === 'desc') return { key: null, direction: null }
      }
      return { key, direction: 'asc' }
    })
  }

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  function resetFilters() {
    setFilters({})
    setSearch('')
    setPage(1)
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === paginated.length && paginated.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(paginated.map((item) => String(item.id))))
    }
  }

  function selectAllOnPage() {
    setSelected(new Set(paginated.map((item) => String(item.id))))
  }

  function selectAllFiltered() {
    const allFilteredIds = sorted.map((item) => String(item.id))
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id))
    setSelected(allSelected ? new Set() : new Set(allFilteredIds))
  }

  function clearSelection() {
    setSelected(new Set())
  }

  const selectedIds = Array.from(selected)
  const selectedCount = selected.size
  const isAllSelected = paginated.length > 0 && selectedCount === paginated.length
  const isSomeSelected = selectedCount > 0 && !isAllSelected
  const isAllFilteredSelected = sorted.length > 0 && sorted.every((item) => selected.has(String(item.id)))
  const isSomeFilteredSelected = selectedCount > 0 && !isAllFilteredSelected

  return {
    search,
    setSearch,
    filters,
    setFilter,
    resetFilters,
    sort,
    toggleSort,
    sortedAndFiltered: sorted,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paginated,
    selected,
    toggleSelect,
    toggleSelectAll,
    selectAllOnPage,
    selectAllFiltered,
    clearSelection,
    selectedIds,
    selectedCount,
    isAllSelected,
    isSomeSelected,
    isAllFilteredSelected,
    isSomeFilteredSelected,
    range,
  }
}
