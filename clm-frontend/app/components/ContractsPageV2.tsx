'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { useRouter } from 'next/navigation';
import { ApiClient, Contract } from '@/app/lib/api-client';

interface ContractStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
}

const ContractsPageV2: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<ContractStats>({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      const client = new ApiClient();
      const response = await client.getContracts();

      if (response.success) {
        const contractsList = Array.isArray(response.data)
          ? response.data
          : response.data?.results || [];
        setContracts(contractsList);

        // Calculate stats
        const newStats = {
          total: contractsList.length,
          draft: contractsList.filter((c: any) => c.status === 'draft').length,
          pending: contractsList.filter((c: any) => c.status === 'pending').length,
          approved: contractsList.filter((c: any) => c.status === 'approved').length,
          rejected: contractsList.filter((c: any) => c.status === 'rejected').length,
        };
        setStats(newStats);
      } else {
        setError(response.error || 'Failed to fetch contracts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      draft: 'bg-slate-50 text-slate-700 border-slate-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const filteredContracts =
    filterStatus === 'all'
      ? contracts
      : contracts.filter((c: any) => c.status === filterStatus);

  return (
    <DashboardLayout
      title="Contracts"
      description="Manage and track all your contracts"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Contracts' },
      ]}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, icon: '📄', bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
          { label: 'Draft', value: stats.draft, icon: '📝', bgColor: 'bg-slate-50', iconColor: 'text-slate-600' },
          { label: 'Pending', value: stats.pending, icon: '⏳', bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
          { label: 'Approved', value: stats.approved, icon: '✅', bgColor: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: 'Rejected', value: stats.rejected, icon: '❌', bgColor: 'bg-red-50', iconColor: 'text-red-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`p-3 ${stat.bgColor} rounded-lg`}>
                <span className={`text-2xl ${stat.iconColor}`}>{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {/* Header */}
        <div className="px-6 py-6 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">All Contracts</h2>
            <p className="text-sm text-slate-600 mt-1">
              {filteredContracts.length} contract{filteredContracts.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'draft', 'pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Create Button */}
            <button
              onClick={() => router.push('/create-contract')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Contract
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-6 py-3 font-semibold text-sm text-slate-700">
                  Contract Name
                </th>
                <th className="text-left px-6 py-3 font-semibold text-sm text-slate-700">
                  Status
                </th>
                <th className="text-left px-6 py-3 font-semibold text-sm text-slate-700">
                  Created
                </th>
                <th className="text-left px-6 py-3 font-semibold text-sm text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No contracts found
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract: any) => (
                  <tr
                    key={contract.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{contract.title || contract.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{contract.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                          contract.status
                        )}`}
                      >
                        {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {contract.created_at
                        ? new Date(contract.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/contracts/${contract.id}`)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                      >
                        View →
                      </button>
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

export default ContractsPageV2;
