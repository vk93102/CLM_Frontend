'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/app/components/Sidebar'
import { useAuth } from '@/app/lib/auth-context'
import { ApiClient, Contract } from '@/app/lib/api-client'

const statusColors = {
  draft: 'bg-slate-100 text-slate-800',
  in_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  signed: 'bg-blue-100 text-blue-800',
}

const statusBgDots = {
  draft: 'bg-slate-400',
  in_review: 'bg-amber-400',
  approved: 'bg-emerald-400',
  signed: 'bg-blue-400',
}

export default function ContractsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  const [contracts, setContracts] = useState<Contract[]>([])
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('date')

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Load contracts
  useEffect(() => {
    const loadContracts = async () => {
      try {
        const client = new ApiClient()
        const response = await client.getContracts()
        
        // Handle nested data structure (response.data.data or just response.data)
        let contractsList: Contract[] = []
        if (response?.data) {
          if (Array.isArray(response.data)) {
            contractsList = response.data
          } else if ((response.data as any)?.data && Array.isArray((response.data as any).data)) {
            contractsList = (response.data as any).data
          }
        }
        
        setContracts(contractsList || [])
      } catch (error) {
        console.error('Failed to load contracts:', error)
        setContracts([])
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated) {
      loadContracts()
    }
  }, [isAuthenticated, router])

  // Filter and search
  useEffect(() => {
    let filtered = [...contracts]

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((c) => c.status === filterStatus)
    }

    // Search by title
    if (searchQuery) {
      filtered = filtered.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort
    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'value') {
      filtered.sort((a, b) => (b.value || 0) - (a.value || 0))
    } else if (sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title))
    }

    setFilteredContracts(filtered)
  }, [contracts, searchQuery, filterStatus, sortBy])

  if (isLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F2F0EB]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contracts...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#F2F0EB]">
      <Sidebar onLogout={handleLogout} />

      <main className="ml-0 lg:ml-[90px] p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-[#2D3748]">Contracts</h1>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
              {contracts.length} {contracts.length === 1 ? 'contract' : 'contracts'}
            </span>
          </div>

          <Link
            href="/create-contract"
            className="w-full sm:w-auto bg-[#0F141F] text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span>
            <span>New Contract</span>
          </Link>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Contracts
              </label>
              <input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="signed">Signed</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                <option value="date">Date (Newest)</option>
                <option value="value">Value (Highest)</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Contracts Grid/List */}
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="p-12 text-center bg-white rounded-xl">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading contracts...</p>
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-xl">
                <p className="text-gray-600 text-lg mb-2">No contracts found</p>
                <p className="text-gray-500 text-sm">Try adjusting your filters or search query</p>
                <Link
                  href="/create-contract"
                  className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Create your first contract
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-gray-900">Title</th>
                        <th className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-gray-900 hidden md:table-cell">Counter Party</th>
                        <th className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-gray-900 hidden sm:table-cell">Value</th>
                        <th className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-gray-900">Status</th>
                        <th className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-gray-900 hidden lg:table-cell">Date</th>
                        <th className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-gray-900">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredContracts.map((contract) => (
                        <tr key={contract.id} className="hover:bg-gray-50 transition cursor-pointer">
                          <td className="px-4 md:px-6 py-4"><p className="font-medium text-gray-900 text-sm md:text-base truncate max-w-xs">{contract.title}</p></td>
                          <td className="px-4 md:px-6 py-4 hidden md:table-cell"><p className="text-gray-600 text-sm">{'-'}</p></td>
                          <td className="px-4 md:px-6 py-4 hidden sm:table-cell"><p className="font-semibold text-gray-900 text-sm md:text-base">${(contract.value || 0).toLocaleString()}</p></td>
                          <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[contract.status as keyof typeof statusColors] || statusColors.draft}`}><span className={`inline-block w-2 h-2 rounded-full mr-2 ${statusBgDots[contract.status as keyof typeof statusBgDots] || statusBgDots.draft}`}></span>{contract.status.replace('_', ' ').charAt(0).toUpperCase() + contract.status.slice(1).replace('_', ' ')}</span></td>
                          <td className="px-6 py-4"><p className="text-slate-600 text-sm">{new Date(contract.created_at).toLocaleDateString()}</p></td>
                          <td className="px-6 py-4"><button className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition font-medium text-sm">View Details</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
