'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { useRouter } from 'next/navigation';

interface Template {
  id: string;
  name: string;
  contract_type: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  created_at?: string;
  updated_at?: string;
  icon?: string;
}

const TemplateLibrary: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const router = useRouter();

  const BASE_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/v1/contract-templates/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const templateList = Array.isArray(data) ? data : data.results || [];
        setTemplates(templateList);
        if (templateList.length > 0) {
          setSelectedTemplate(templateList[0]);
        }
      } else if (response.status === 401) {
        router.push('/');
      } else {
        setError('Failed to load templates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (contractType: string) => {
    const icons: { [key: string]: string } = {
      'service_agreement': '📋',
      'nda': '🔐',
      'partnership': '🤝',
      'employment': '👔',
      'marketing': '📢',
    };
    return icons[contractType.toLowerCase()] || '📄';
  };

  return (
    <DashboardLayout
      title="Template Library"
      description="Browse and manage contract templates"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Templates' },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template List - Left Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Recent Documents
                </h2>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                  {templates.length} templates
                </span>
              </div>
              <input
                type="text"
                placeholder="Search templates..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Template List Items */}
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-slate-500">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                  Loading templates...
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-600 text-sm">{error}</div>
              ) : templates.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No templates found
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 border-b border-slate-100 cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'bg-blue-50 border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTypeIcon(template.contract_type)}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 truncate text-sm">
                          {template.name}
                        </h3>
                        <p className="text-xs text-slate-500 capitalize">
                          {template.status} • {template.contract_type}
                        </p>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Create New Template Button */}
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={() => router.push('/templates/create')}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                + New Template
              </button>
            </div>
          </div>
        </div>

        {/* Template Details - Main Content */}
        <div className="lg:col-span-3">
          {selectedTemplate ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              {/* Template Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-12 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-slate-300 text-sm uppercase tracking-widest mb-2">
                      {selectedTemplate.contract_type.replace('_', ' ')}
                    </p>
                    <h1 className="text-4xl font-bold mb-4">
                      {selectedTemplate.name}
                    </h1>
                    <p className="text-slate-300 max-w-2xl leading-relaxed">
                      {selectedTemplate.description ||
                        'This is a professional contract template ready for use.'}
                    </p>
                  </div>
                  <span className="text-6xl">{getTypeIcon(selectedTemplate.contract_type)}</span>
                </div>
              </div>

              {/* Template Content */}
              <div className="p-8 space-y-6">
                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => router.push(`/create-contract?template=${selectedTemplate.id}`)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Use Template
                  </button>
                  <button className="px-6 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                  <button className="px-6 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Status</p>
                    <p className="text-lg font-semibold text-slate-900 capitalize mt-1">
                      {selectedTemplate.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Type</p>
                    <p className="text-lg font-semibold text-slate-900 capitalize mt-1">
                      {selectedTemplate.contract_type.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Created</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {selectedTemplate.created_at
                        ? new Date(selectedTemplate.created_at).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Additional Sections */}
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">
                      Key Sections
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        'Definitions',
                        'Scope of Work',
                        'Payment Terms',
                        'Confidentiality',
                        'Liability',
                        'Termination',
                      ].map((section) => (
                        <div
                          key={section}
                          className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700"
                        >
                          ✓ {section}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
              <p className="text-slate-500 text-lg">Select a template to view details</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TemplateLibrary;
