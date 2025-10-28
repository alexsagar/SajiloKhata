import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { expenseAPI } from '@/lib/api'
import { groupAPI } from '@/lib/api'
import { userAPI } from '@/lib/api'

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
  const [isSearching, setIsSearching] = useState(false)

  // Search expenses
  const { data: expenseResults } = useQuery({
    queryKey: ['search-expenses', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return []
      try {
        const response = await expenseAPI.getExpenses({ 
          search: searchQuery,
          limit: 10 
        })
        return response.data.expenses || []
      } catch (error) {
        console.error('Error searching expenses:', error)
        return []
      }
    },
    enabled: searchQuery.length > 2,
    staleTime: 5 * 60 * 1000,
  })

  // Search groups
  const { data: groupResults } = useQuery({
    queryKey: ['search-groups', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return []
      try {
        const response = await groupAPI.getGroups({ 
          search: searchQuery,
          limit: 10 
        })
        return response.data.groups || []
      } catch (error) {
        console.error('Error searching groups:', error)
        return []
      }
    },
    enabled: searchQuery.length > 2,
    staleTime: 5 * 60 * 1000,
  })

  // Search users
  const { data: userResults } = useQuery({
    queryKey: ['search-users', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return []
      try {
        const response = await userAPI.searchUsers({ 
          query: searchQuery,
          limit: 10 
        })
        return response.data.users || []
      } catch (error) {
        console.error('Error searching users:', error)
        return []
      }
    },
    enabled: searchQuery.length > 2,
    staleTime: 5 * 60 * 1000,
  })

  // Combine and format search results
  const searchResults = useMemo(() => {
    const results: SearchResult[] = []

    // Add expense results
    if (expenseResults) {
      expenseResults.forEach((expense: any) => {
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
    if (groupResults) {
      groupResults.forEach((group: any) => {
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
    if (userResults) {
      userResults.forEach((user: any) => {
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
  }, [expenseResults, groupResults, userResults])

  const performSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setIsSearching(true)
    
    // Simulate search delay for better UX
    setTimeout(() => {
      setIsSearching(false)
    }, 300)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setIsSearching(false)
  }, [])

  return {
    searchQuery,
    searchResults,
    isSearching,
    performSearch,
    clearSearch,
    hasResults: searchResults.length > 0,
    totalResults: searchResults.length,
  }
}
