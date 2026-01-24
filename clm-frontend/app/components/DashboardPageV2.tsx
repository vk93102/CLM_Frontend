'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/auth-context';
import { ApiClient } from '@/app/lib/api-client';

interface Contract {
  id: string;
  name: string;
  title?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  date: string;
  created_at?: string;
  value: number;
  trend: number;
}

interface DashboardStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
}

const DashboardPageV2: React.FC = () => {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [recentContracts, setRecentContracts] = useState<Contract[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsSyncing(true);
        const client = new ApiClient();
        const response = await client.getContracts();

        if (response.success && response.data) {
          const contracts = Array.isArray(response.data)
            ? response.data
            : response.data.results || [];

          const total = contracts.length;
          const draft = contracts.filter((c: any) => c.status === 'draft').length;
          const pending = contracts.filter((c: any) => c.status === 'pending').length;
          const approved = contracts.filter((c: any) => c.status === 'approved').length;
          const rejected = contracts.filter((c: any) => c.status === 'rejected').length;

          setStats({ total, draft, pending, approved, rejected });

          const recent: Contract[] = contracts.slice(0, 5).map((contract: any) => ({
            id: contract.id,
            name: contract.title || contract.name,
            status: contract.status,
            date: contract.created_at || new Date().toISOString().split('T')[0],
            value: contract.value || 0,
            trend: Math.random() * 20 - 10,
          }));

          setRecentContracts(recent);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      draft: 'bg-slate-50 text-slate-700 border-slate-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getTrendColor = (trend: number) => {
    return trend > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? '↑' : '↓';
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout
      title="Dashboard"
      description="Welcome back! Here's an overview of your contracts and activities."
      breadcrumbs={[{ label: 'Dashboard' }]}
    >
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Total Contracts */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">
                Total Contracts
              </p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Draft */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Draft</p>
              <p className="text-3xl font-bold text-slate-900">{stats.draft}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Pending</p>
              <p className="text-3xl font-bold text-slate-900">{stats.pending}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Approved</p>
              <p className="text-3xl font-bold text-slate-900">{stats.approved}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Rejected</p>
              <p className="text-3xl font-bold text-slate-900">{stats.rejected}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Contracts Section */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Recent Contracts</h2>
            <p className="text-sm text-slate-600 mt-1">Latest 5 contracts from your account</p>
          </div>
          <button
            onClick={() => router.push('/contracts')}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium text-sm transition-colors"
          >
            View all →
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-sm text-slate-700">
                  Contract Name
                </th>
                <th className="text-left px-6 py-3 font-semibold text-sm text-slate-700">
                  Status
                </th>
                <th className="text-left px-6 py-3 font-semibold text-sm text-slate-700">
                  Date
                </th>
                <th className="text-left px-6 py-3 font-semibold text-sm text-slate-700">
                  Value
                </th>
                <th className="text-left px-6 py-3 font-semibold text-sm text-slate-700">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {isSyncing ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : recentContracts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No contracts found. Create your first contract to get started.
                  </td>
                </tr>
              ) : (
                recentContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/contracts/${contract.id}`)}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{contract.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{contract.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                          contract.status
                        )}`}
                      >
                        {contract.status.charAt(0).toUpperCase() +
                          contract.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(contract.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      ${contract.value.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-semibold ${getTrendColor(
                          contract.trend
                        )}`}
                      >
                        {getTrendIcon(contract.trend)}{' '}
                        {Math.abs(contract.trend).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPageV2;
