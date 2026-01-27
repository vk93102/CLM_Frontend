'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/app/components/Sidebar'
import { useAuth } from '@/app/lib/auth-context'
import { ApiClient } from '@/app/lib/api-client'

interface Contract {
  id: string
  name: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active'
  date: string
  value: number
}

interface DashboardStats {
  total: number
  draft: number
  pending: number
  approved: number
  rejected: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [isSyncing, setIsSyncing] = useState(true)
  const [recentContracts, setRecentContracts] = useState<Contract[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [apiError, setApiError] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Fetch ONLY real data from backend API
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return
      
      try {
        const client = new ApiClient()
        const response = await client.getContracts()
        
        if (response.success && response.data) {
          const contracts = (Array.isArray(response.data) ? response.data : response.data.results || []).map((contract: any) => ({
            id: contract.id,
            name: contract.title || contract.name,
            status: contract.status,
            date: contract.created_at || new Date().toISOString().split('T')[0],
            value: contract.value || 0,
          }))
          
          setRecentContracts(contracts.slice(0, 5))
          
          const total = contracts.length
          const draft = contracts.filter((c: any) => c.status === 'draft').length
          const pending = contracts.filter((c: any) => c.status === 'pending').length
          const approved = contracts.filter((c: any) => c.status === 'approved').length
          const rejected = contracts.filter((c: any) => c.status === 'rejected').length

          setStats({ total, draft, pending, approved, rejected })
          setApiError(false)
        }
      } catch (error) {
        console.error('Failed to fetch from backend:', error)
        setApiError(true)
      } finally {
        setIsSyncing(false)
        setDataLoaded(true)
      }
    }

    fetchData()
  }, [user])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-orange-100 text-orange-700'
      case 'draft':
        return 'bg-blue-100 text-blue-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return '✓'
      case 'pending':
        return '⏳'
      case 'draft':
        return '📝'
      case 'rejected':
        return '✗'
      default:
        return '●'
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Sidebar onLogout={handleLogout} />

      <main className="ml-[90px] p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Contract Lifecycle Dashboard</h1>
            <p className="text-gray-600">Overview of metrics, contracts, and platform activity</p>
          </div>

          <div className="flex items-center gap-4">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              Advanced Filters
            </button>
            <Link
              href="/create-contract"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg hover:shadow-lg transition-all"
            >
              + Create Contract
            </Link>
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition">
              <span className="text-xl">🔔</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
          </div>
        </div>

        {/* Main Content */}
        {!dataLoaded ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center bg-white rounded-2xl p-12 shadow-sm">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading contract data...</p>
            </div>
          </div>
        ) : apiError ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Backend Connection Error</h2>
            <p className="text-gray-600 mb-6">Unable to connect to the backend API. Please ensure the server is running on port 11000.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transition"
            >
              Retry Connection
            </button>
          </div>
        ) : stats.total === 0 ? (
          <div className="bg-white rounded-2xl p-16 shadow-sm text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📋</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No Contracts Yet</h2>
            <p className="text-gray-600 mb-8">Get started by creating your first contract or importing existing ones.</p>
            <Link
              href="/create-contract"
              className="inline-block px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-lg hover:shadow-lg transition"
            >
              Create Your First Contract
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Total Contracts */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-xl">📊</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500">TOTAL</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
                <p className="text-sm text-gray-600">Total Contracts</p>
              </div>

              {/* Draft */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <span className="text-white text-xl">📝</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500">DRAFT</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stats.draft}</div>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>

              {/* Pending */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                    <span className="text-white text-xl">⏳</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500">PENDING</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stats.pending}</div>
                <p className="text-sm text-gray-600">Awaiting Review</p>
              </div>

              {/* Approved */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <span className="text-white text-xl">✓</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500">APPROVED</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stats.approved}</div>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>

            {/* Recent Contracts Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Recent Contracts</h2>
                  <p className="text-sm text-gray-500">View and manage active agreements across the organization</p>
                </div>
                <Link
                  href="/contracts"
                  className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                >
                  View All
                </Link>
              </div>

              <div className="divide-y divide-gray-100">
                {recentContracts.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-gray-500">No contracts to display</p>
                  </div>
                ) : (
                  recentContracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="p-6 hover:bg-gray-50 transition group cursor-pointer"
                      onClick={() => router.push(`/contracts/${contract.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                            <span className="text-lg">📄</span>
                          </div>

                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition mb-1">
                              {contract.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              ID: {contract.id} • Created {new Date(contract.date).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">VALUE</p>
                              <p className="text-sm font-semibold text-gray-900">
                                ${contract.value.toLocaleString()}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 mb-1">STATUS</p>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(contract.status)}`}>
                                {getStatusIcon(contract.status)}
                                {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="ml-4 text-gray-400 group-hover:text-indigo-600 transition">
                          →
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
