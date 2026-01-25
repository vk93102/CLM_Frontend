'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  Download,
  FileText,
  Minus,
  PlusCircle,
  Plus,
  Search,
  Shield,
} from 'lucide-react';
import { ApiClient, FileTemplateItem } from '@/app/lib/api-client';

type Template = FileTemplateItem;

type TemplateTypeKey =
  | 'NDA'
  | 'MSA'
  | 'EMPLOYMENT'
  | 'SERVICE_AGREEMENT'
  | 'AGENCY_AGREEMENT'
  | 'PROPERTY_MANAGEMENT'
  | 'PURCHASE_AGREEMENT';

function toTemplateTypeKey(contractType: string): TemplateTypeKey {
  const t = (contractType || '').toLowerCase();
  if (t.includes('nda')) return 'NDA';
  if (t.includes('employment')) return 'EMPLOYMENT';
  if (t.includes('agency')) return 'AGENCY_AGREEMENT';
  if (t.includes('property')) return 'PROPERTY_MANAGEMENT';
  if (t.includes('msa')) return 'MSA';
  if (t.includes('purchase')) return 'PURCHASE_AGREEMENT';
  return 'SERVICE_AGREEMENT';
}

function statusPill(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'published' || s === 'active') return { label: 'ACTIVE', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (s === 'archived') return { label: 'ARCHIVED', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  return { label: 'DRAFT', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
}

const TemplateLibrary: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'Agreements' | 'NDA' | 'SOW' | 'All'>('All');
  const [zoom, setZoom] = useState(100);
  const [rawTemplateDoc, setRawTemplateDoc] = useState('');
  const [previewTemplateDoc, setPreviewTemplateDoc] = useState('');
  const [previewMode, setPreviewMode] = useState<'raw' | 'filled'>('raw');
  const [templateDocLoading, setTemplateDocLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState('NDA');
  const [createDescription, setCreateDescription] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [form, setForm] = useState<Record<string, string>>({
    counterparty_name: '',
    effective_date: '',
    duration_months: '12',
    termination_clause: 'Standard (30 days notice)',
    governing_law: 'State of Delaware',
  });
  const router = useRouter();

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (!selectedTemplate) return;
    const load = async () => {
      try {
        setTemplateDocLoading(true);
        const client = new ApiClient();
        const response = await client.getTemplateFileContent(selectedTemplate.filename);
        if (response.success && response.data) {
          const content = (response.data as any).content || '';
          setRawTemplateDoc(content);
          setPreviewTemplateDoc(content);
          setPreviewMode('raw');
          return;
        }
        setRawTemplateDoc('');
        setPreviewTemplateDoc('');
      } catch {
        setRawTemplateDoc('');
        setPreviewTemplateDoc('');
      } finally {
        setTemplateDocLoading(false);
      }
    };
    load();
  }, [selectedTemplate]);

  useEffect(() => {
    // Real-time preview updates while in "Filled" mode.
    if (!rawTemplateDoc) return;
    if (previewMode !== 'filled') return;

    const replacements: Record<string, string> = {
      counterparty_name: form.counterparty_name,
      effective_date: form.effective_date,
      duration_months: form.duration_months,
      termination_clause: form.termination_clause,
      governing_law: form.governing_law,
    };

    let next = rawTemplateDoc;
    Object.entries(replacements).forEach(([k, v]) => {
      const rx = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g');
      next = next.replace(rx, v || `{{${k}}}`);
    });
    setPreviewTemplateDoc(next);
  }, [rawTemplateDoc, form, previewMode]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const client = new ApiClient();
      const response = await client.listTemplateFiles();

      if (!response.success) {
        if ((response.error || '').toLowerCase().includes('unauthorized')) {
          router.push('/');
          return;
        }
        setError(response.error || 'Failed to load templates');
        return;
      }

      const templateList = (response.data as any)?.results || [];

      setTemplates(templateList);
      if (templateList.length > 0) {
        setSelectedTemplate(templateList[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    try {
      setCreateBusy(true);
      const client = new ApiClient();
      const displayName = createName.trim() || 'New Template';
      const content =
        createContent ||
        `${displayName.toUpperCase()}\n\n${(createDescription || '').trim()}\n\n[Paste your template text here]\n`;

      const res = await client.createTemplateFile({
        filename: `${createType}-${displayName}`,
        content,
      });
      if (!res.success) {
        setError(res.error || 'Failed to create template');
        return;
      }
      setCreateOpen(false);
      setCreateName('');
      setCreateType('NDA');
      setCreateDescription('');
      setCreateContent('');
      await fetchTemplates();
    } finally {
      setCreateBusy(false);
    }
  };

  const stats = useMemo(() => {
    const total = templates.length;
    const drafts = templates.filter((t) => (t.status || '').toLowerCase() === 'draft').length;
    const lastUpdated = templates
      .filter((t) => t.updated_at)
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];

    const byName = new Map<string, number>();
    templates.forEach((t) => {
      byName.set(t.name, (byName.get(t.name) || 0) + 1);
    });
    const mostUsed = Array.from(byName.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      drafts,
      mostUsedName: mostUsed?.[0] || (templates[0]?.name || '—'),
      mostUsedCount: mostUsed?.[1] || 0,
      lastUpdatedName: lastUpdated?.name || '—',
      lastUpdatedWhen: lastUpdated?.updated_at ? new Date(lastUpdated.updated_at).toLocaleDateString() : '—',
    };
  }, [templates]);

  const categories = useMemo(() => {
    const nda = templates.filter((t) => (t.contract_type || '').toLowerCase().includes('nda')).length;
    const sow = templates.filter((t) => (t.contract_type || '').toLowerCase().includes('sow')).length;
    const agreements = templates.length - nda - sow;
    return {
      All: templates.length,
      Agreements: Math.max(agreements, 0),
      NDA: nda,
      SOW: sow,
    };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const s = search.trim().toLowerCase();
    return templates
      .filter((t) => {
        const ct = (t.contract_type || '').toLowerCase();
        if (activeCategory === 'All') return true;
        if (activeCategory === 'NDA') return ct.includes('nda');
        if (activeCategory === 'SOW') return ct.includes('sow');
        return !ct.includes('nda') && !ct.includes('sow');
      })
      .filter((t) => {
        if (!s) return true;
        return (t.name || '').toLowerCase().includes(s) || (t.description || '').toLowerCase().includes(s);
      });
  }, [templates, search, activeCategory]);

  const resetForm = () => {
    setForm({
      counterparty_name: '',
      effective_date: '',
      duration_months: '12',
      termination_clause: 'Standard (30 days notice)',
      governing_law: 'State of Delaware',
    });
  };

  const updatePreview = () => {
    if (!rawTemplateDoc) return;
    setPreviewMode('filled');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-extrabold text-slate-900">Template Library</h1>
              <button className="hidden md:inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-700">
                All Templates
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {selectedTemplate && (
              <div className="hidden md:flex items-center gap-2 bg-white rounded-full border border-slate-200 px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span className="text-sm text-slate-700">Editing: {selectedTemplate.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full bg-white border border-slate-200 rounded-full pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>

            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#0F141F] text-white px-5 py-3 text-sm font-semibold"
            >
              <PlusCircle className="w-4 h-4" />
              New Template
            </button>

            <button
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border border-slate-200"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        </div>

        {/* Top Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 text-white p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 30%, #fff 0 2px, transparent 3px)' }} />
            <p className="text-white/90 text-sm">Total Templates</p>
            <p className="text-5xl font-bold mt-2">{stats.total}</p>
            <div className="inline-flex items-center mt-4 px-3 py-1 rounded-full bg-white/20 text-xs">
              +{Math.min(stats.total, 2)} this month
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6">
            <p className="text-slate-500 text-sm">Recently Used</p>
            <p className="text-xl font-bold text-slate-900 mt-2">{stats.mostUsedName}</p>
            <p className="text-xs text-slate-500 mt-1">Used {stats.mostUsedCount} times</p>
            <div className="mt-4 inline-flex items-center gap-2 text-rose-500 text-sm font-semibold">
              <span className="w-4 h-4 rounded bg-rose-50 border border-rose-200 inline-flex items-center justify-center">↗</span>
              Popular choice
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6">
            <p className="text-slate-500 text-sm">My Drafts</p>
            <p className="text-4xl font-bold text-slate-900 mt-2">{String(stats.drafts).padStart(2, '0')}</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">JD</span>
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">+2</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6">
            <p className="text-slate-500 text-sm">Last Updated</p>
            <p className="text-xl font-bold text-slate-900 mt-2">{stats.lastUpdatedName}</p>
            <p className="text-xs text-slate-500 mt-1">Updated {stats.lastUpdatedWhen}</p>
            <p className="text-xs text-slate-400 mt-4">Version 1.0</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left: Categories + Templates */}
          <div className="xl:col-span-3">
            <div className="bg-white border border-slate-200 rounded-3xl p-5">
              <h3 className="text-sm font-semibold text-slate-700">Categories</h3>
              <div className="mt-4 space-y-2">
                {(['All', 'Agreements', 'NDA', 'SOW'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setActiveCategory(c)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition ${
                      activeCategory === c
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{c}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-lg ${
                        activeCategory === c ? 'bg-white/20' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {(categories as any)[c] ?? 0}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 tracking-widest">TEMPLATES</p>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {loading ? (
                  <div className="text-slate-500 text-sm py-8 text-center">Loading templates…</div>
                ) : error ? (
                  <div className="text-red-600 text-sm py-8 text-center">{error}</div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-slate-500 text-sm py-8 text-center">No templates found</div>
                ) : (
                  filteredTemplates.map((t) => {
                    const pill = statusPill(t.status);
                    const active = selectedTemplate?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t)}
                        className={`w-full text-left rounded-2xl border p-4 transition ${
                          active ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                            {(t.contract_type || '').toLowerCase().includes('nda') ? (
                              <Shield className="w-5 h-5 text-slate-700" />
                            ) : (
                              <FileText className="w-5 h-5 text-slate-700" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{t.name}</p>
                            <p className="text-xs text-slate-500 mt-1 truncate">
                              {t.description || 'Template'}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className={`text-[10px] px-2 py-1 rounded-full border ${pill.cls}`}>{pill.label}</span>
                              <span className="text-[10px] text-slate-400">v1.0</span>
                            </div>
                          </div>
                          {active && <span className="w-5 h-5 rounded-full border-2 border-rose-400 bg-white flex items-center justify-center">✓</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Center: Configure Template */}
          <div className="xl:col-span-5">
            <div className="bg-white border border-slate-200 rounded-3xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Configure Template</h2>
                  <p className="text-sm text-slate-500 mt-1">{selectedTemplate?.name || 'Select a template'}</p>
                </div>
                <button onClick={resetForm} className="text-sm font-semibold text-rose-500">Reset Form</button>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Counterparty Name</label>
                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input
                      value={form.counterparty_name}
                      onChange={(e) => setForm((p) => ({ ...p, counterparty_name: e.target.value }))}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-transparent outline-none text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Effective Date</label>
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <input
                        type="date"
                        value={form.effective_date}
                        onChange={(e) => setForm((p) => ({ ...p, effective_date: e.target.value }))}
                        className="w-full bg-transparent outline-none text-sm text-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Duration (Months)</label>
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <input
                        value={form.duration_months}
                        onChange={(e) => setForm((p) => ({ ...p, duration_months: e.target.value }))}
                        className="w-full bg-transparent outline-none text-sm text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Termination Clause</label>
                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
                    <select
                      value={form.termination_clause}
                      onChange={(e) => setForm((p) => ({ ...p, termination_clause: e.target.value }))}
                      className="w-full bg-transparent outline-none text-sm text-slate-900"
                    >
                      <option>Standard (30 days notice)</option>
                      <option>Strict (15 days notice)</option>
                      <option>Flexible (60 days notice)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Governing Law</label>
                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
                    <select
                      value={form.governing_law}
                      onChange={(e) => setForm((p) => ({ ...p, governing_law: e.target.value }))}
                      className="w-full bg-transparent outline-none text-sm text-slate-900"
                    >
                      <option>State of Delaware</option>
                      <option>State of California</option>
                      <option>State of New York</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                    onClick={() => router.push(`/create-contract?template=${encodeURIComponent(selectedTemplate?.filename || '')}`)}
                    disabled={!selectedTemplate}
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl bg-[#0F141F] px-4 py-3 text-sm font-semibold text-white"
                    onClick={updatePreview}
                    disabled={!selectedTemplate}
                  >
                    Update Preview
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="xl:col-span-4">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center" onClick={() => setZoom((z) => Math.max(50, z - 10))}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="text-xs font-semibold text-slate-600 w-12 text-center">{zoom}%</div>
                  <button className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center" onClick={() => setZoom((z) => Math.min(150, z + 10))}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-sm font-semibold">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 origin-top" style={{ transform: `scale(${zoom / 100})` }}>
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-slate-900" />
                    <div className="text-xs text-slate-400">DOC-LOCAL-{selectedTemplate?.id?.slice(0, 6) || '000001'}</div>
                  </div>

                  <div className="mt-6 text-center">
                    <h3 className="text-xl font-black tracking-wide text-slate-900 uppercase">
                      {selectedTemplate?.name || 'TEMPLATE'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Effective Date: {form.effective_date || '[DATE]'} </p>
                  </div>

                  <div className="mt-6">
                    {templateDocLoading ? (
                      <div className="text-sm text-slate-500">Loading preview…</div>
                    ) : rawTemplateDoc ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-[11px] font-semibold text-slate-700">
                            <button
                              type="button"
                              onClick={() => setPreviewMode('raw')}
                              className={
                                previewMode === 'raw'
                                  ? 'rounded-full bg-[#0F141F] text-white px-3 py-1'
                                  : 'rounded-full px-3 py-1 hover:bg-slate-50'
                              }
                            >
                              Raw
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewMode('filled')}
                              className={
                                previewMode === 'filled'
                                  ? 'rounded-full bg-[#0F141F] text-white px-3 py-1'
                                  : 'rounded-full px-3 py-1 hover:bg-slate-50'
                              }
                            >
                              Filled
                            </button>
                          </div>
                          <div className="text-xs text-slate-400">Exact .txt content</div>
                        </div>

                        <pre className="whitespace-pre-wrap text-[11px] leading-6 text-slate-800 font-serif max-h-[520px] overflow-auto">
                          {previewMode === 'raw' ? rawTemplateDoc : previewTemplateDoc}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No preview available for this template type.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !createBusy && setCreateOpen(false)} />
          <div className="relative w-[92vw] max-w-lg rounded-3xl bg-white border border-slate-200 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">New Template</h3>
              <button className="text-slate-500 hover:text-slate-800" onClick={() => !createBusy && setCreateOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Name</label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="e.g. Standard MSA"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Type</label>
                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
                  <select
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm text-slate-900"
                  >
                    <option value="NDA">NDA</option>
                    <option value="MSA">MSA</option>
                    <option value="EMPLOYMENT">Employment</option>
                    <option value="AGENCY_AGREEMENT">Agency Agreement</option>
                    <option value="PROPERTY_MANAGEMENT">Property Management</option>
                    <option value="SERVICE_AGREEMENT">Service Agreement</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="mt-2 w-full min-h-[96px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="Short summary (optional)"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Template Text</label>
                <textarea
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  className="mt-2 w-full min-h-[180px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-200 font-mono"
                  placeholder="Paste the exact template text (.txt) you want to display"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Saved as a new <span className="font-semibold">.txt</span> file in the backend templates folder (no database).
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                onClick={() => setCreateOpen(false)}
                disabled={createBusy}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-2xl bg-[#0F141F] px-4 py-3 text-sm font-semibold text-white"
                onClick={createTemplate}
                disabled={createBusy}
              >
                {createBusy ? 'Creating…' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TemplateLibrary;
