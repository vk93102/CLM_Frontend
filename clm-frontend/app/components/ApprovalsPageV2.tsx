'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';

interface ApprovalItem {
  id: string;
  contractTitle: string;
  requester: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  priority: 'low' | 'medium' | 'high';
}

const ApprovalsPageV2: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    {
      id: '1',
      contractTitle: 'Service Agreement - Acme Corp',
      requester: 'John Doe',
      status: 'pending',
      submittedDate: '2024-01-24',
      priority: 'high',
    },
    {
      id: '2',
      contractTitle: 'NDA - Tech Startup Inc',
      requester: 'Sarah Smith',
      status: 'pending',
      submittedDate: '2024-01-23',
      priority: 'medium',
    },
  ]);
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      high: 'text-red-600 bg-red-50',
      medium: 'text-amber-600 bg-amber-50',
      low: 'text-green-600 bg-green-50',
    };
    return colors[priority] || 'text-slate-600 bg-slate-50';
  };

  const filteredApprovals =
    filterStatus === 'all'
      ? approvals
      : approvals.filter((a) => a.status === filterStatus);

  const handleApprove = (id: string) => {
    setApprovals(
      approvals.map((a) =>
        a.id === id ? { ...a, status: 'approved' as const } : a
      )
    );
  };

  const handleReject = (id: string) => {
    setApprovals(
      approvals.map((a) =>
        a.id === id ? { ...a, status: 'rejected' as const } : a
      )
    );
  };

  return (
    <DashboardLayout
      title="Approvals"
      description="Review and approve pending contracts"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Approvals' },
      ]}
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-600 mb-2">Pending</p>
          <p className="text-3xl font-bold text-amber-600">
            {approvals.filter((a) => a.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-600 mb-2">Approved</p>
          <p className="text-3xl font-bold text-green-600">
            {approvals.filter((a) => a.status === 'approved').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-600 mb-2">Rejected</p>
          <p className="text-3xl font-bold text-red-600">
            {approvals.filter((a) => a.status === 'rejected').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-600 mb-2">Total</p>
          <p className="text-3xl font-bold text-slate-900">{approvals.length}</p>
        </div>
      </div>

      {/* Approvals List */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {/* Header */}
        <div className="px-6 py-6 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Pending Approvals</h2>
            <p className="text-sm text-slate-600 mt-1">
              {filteredApprovals.length} item{filteredApprovals.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
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
        </div>

        {/* List */}
        <div className="divide-y divide-slate-200">
          {filteredApprovals.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-500">
              No approvals to show
            </div>
          ) : (
            filteredApprovals.map((approval) => (
              <div
                key={approval.id}
                className="px-6 py-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 mb-2">
                      {approval.contractTitle}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                      <span>Requester: {approval.requester}</span>
                      <span>Submitted: {new Date(approval.submittedDate).toLocaleDateString()}</span>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(
                          approval.priority
                        )}`}
                      >
                        {approval.priority.charAt(0).toUpperCase() +
                          approval.priority.slice(1)}{' '}
                        Priority
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                        approval.status
                      )}`}
                    >
                      {approval.status.charAt(0).toUpperCase() +
                        approval.status.slice(1)}
                    </span>

                    {approval.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(approval.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(approval.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ApprovalsPageV2;
