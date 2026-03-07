import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { userAPI } from '@/lib/api'
import { useDebounce } from "@/hooks/use-debounce"

export interface SearchResult {
  id: string
  type: 'expense' | 'group' | 'user'
  title: string
  description?: string
  amount?: number
  currency?: string
  date?: string
  category?: string
  avatar?: string
  url: string
}

export function useGlobalSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 300)

  const { data: searchPayload, isFetching } = useQuery({
    queryKey: ['search-global', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) {
        return { users: [], groups: [], expenses: [] }
      }
      try {
        const response = await userAPI.searchGlobal({
          query: debouncedQuery,
          limit: 10 
        })
        return {
          users: response.data?.users || [],
          groups: response.data?.groups || [],
          expenses: response.data?.expenses || [],
        }
      } catch (error) {
        return { users: [], groups: [], expenses: [] }
      }
    },
    enabled: debouncedQuery.length > 2,
    staleTime: 5 * 60 * 1000,
  })

  // Combine and format search results
  const searchResults = useMemo(() => {
    const results: SearchResult[] = []

    // Add expense results
    if (searchPayload?.expenses) {
      searchPayload.expenses.forEach((expense: any) => {
        results.push({
          id: expense._id,
          type: 'expense',
          title: expense.description,
          description: `$${(expense.amountCents / 100).toFixed(2)} - ${expense.category}`,
          amount: expense.amountCents / 100,
          currency: expense.currencyCode,
          date: expense.date,
          category: expense.category,
          url: `/expenses/${expense._id}`,
        })
      })
    }

    // Add group results
    if (searchPayload?.groups) {
      searchPayload.groups.forEach((group: any) => {
        results.push({
          id: group._id,
          type: 'group',
          title: group.name,
          description: `${group.members?.length || 0} members`,
          avatar: group.avatar,
          url: `/groups/${group._id}`,
        })
      })
    }

    // Add user results
    if (searchPayload?.users) {
      searchPayload.users.forEach((user: any) => {
        results.push({
          id: user._id,
          type: 'user',
          title: `${user.firstName} ${user.lastName}`,
          description: user.username,
          avatar: user.avatar,
          url: `/profile/${user._id}`,
        })
      })
    }

    return results
  }, [searchPayload])

  const performSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  return {
    searchQuery,
    searchResults,
    isSearching: isFetching && debouncedQuery.length > 2,
    performSearch,
    clearSearch,
    hasResults: searchResults.length > 0,
    totalResults: searchResults.length,
  }
}
