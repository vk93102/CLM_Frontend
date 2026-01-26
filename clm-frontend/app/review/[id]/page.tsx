'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { ApiClient, ReviewContractDetail, ReviewContractStatus } from '../../lib/api-client';
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Minus,
  Plus,
  RefreshCcw,
  Search,
  TriangleAlert,
} from 'lucide-react';

const statusPill = (status: ReviewContractStatus) => {
  const map: Record<ReviewContractStatus, string> = {
    uploaded: 'bg-slate-50 text-slate-700 border-slate-200',
    processing: 'bg-amber-50 text-amber-700 border-amber-200',
    ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return map[status] || 'bg-slate-50 text-slate-700 border-slate-200';
};

const asArray = (v: any): any[] => (Array.isArray(v) ? v : []);

const toLabelValue = (d: any): { label: string; value: string; color?: 'rose' | 'amber' | 'emerald' | 'slate' } => {
  if (!d || typeof d !== 'object') return { label: 'Date', value: String(d || '') };
  const label = String(d.label || d.name || 'Date');
  const value = String(d.value || d.date || d.text || '');
  const rawType = String(d.type || d.kind || '').toLowerCase();
  const color: any = rawType.includes('expire') ? 'rose' : rawType.includes('effective') ? 'amber' : 'slate';
  return { label, value, color };
};

const Chip = ({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'slate' | 'amber' | 'rose' | 'emerald' | 'violet';
}) => {
  const cls: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  };
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${cls[tone] || cls.slate}`}>
      {children}
    </span>
  );
};

export default function ReviewDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const downloadRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<ReviewContractDetail | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);

  const [extractionQuery, setExtractionQuery] = useState('');
  const [showExtractedMobile, setShowExtractedMobile] = useState(true);

  const [downloadOpen, setDownloadOpen] = useState(false);
  const [zoom, setZoom] = useState(100);

  const analysis = item?.analysis || {};
  const analysisSummary = (analysis as any)?.analysis_summary || {};

  const load = async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const client = new ApiClient();
      const res = await client.getReviewContractById(id);
      if (!res.success) throw new Error(res.error || 'Failed to load');
      setItem(res.data as any);

      const urlRes = await client.getReviewContractUrl(id);
      if (urlRes.success) {
        const url = (urlRes.data as any)?.url as string | undefined;
        setFileUrl(url || null);
        setFileText(null);

        const ft = ((res.data as any)?.file_type || '').toLowerCase();
        if (url && ft === 'txt') {
          const txt = await fetch(url).then((r) => r.text());
          setFileText(txt);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!downloadOpen) return;
      const el = downloadRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setDownloadOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [downloadOpen]);

  const downloadReport = async (kind: 'txt' | 'pdf') => {
    if (!item) return;
    setError(null);
    setBusy(true);
    try {
      const client = new ApiClient();
      const res =
        kind === 'txt'
          ? await client.downloadReviewReportTxt(item.id)
          : await client.downloadReviewReportPdf(item.id);
      if (!res.success || !res.data) throw new Error(res.error || 'Download failed');

      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const base = (item.title || item.original_filename || 'lawflow_report').trim().replace(/\s+/g, '_');
      a.download = kind === 'txt' ? `${base}_review.txt` : `${base}_review.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  };

  const openOriginal = () => {
    if (!fileUrl) return;
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const analyzeNow = async () => {
    if (!item) return;
    setError(null);
    setBusy(true);
    try {
      const client = new ApiClient();
      const res = await client.analyzeReviewContract(item.id);
      if (!res.success) throw new Error(res.error || 'Analyze failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analyze failed');
    } finally {
      setBusy(false);
    }
  };

  const summary = String((analysis as any)?.summary || '').trim();
  const parties = asArray(analysis?.parties);
  const dates = asArray(analysis?.dates);
  const values = asArray(analysis?.values);
  const obligations = asArray(analysis?.obligations);
  const constraints = asArray((analysis as any)?.constraints);
  const clauses = asArray(analysis?.clauses);
  const insights = asArray(analysis?.insights);
  const suggestions = asArray(analysis?.suggestions);

  const jurisdiction = String((analysis as any)?.jurisdiction || '').trim();

  const q = extractionQuery.trim().toLowerCase();
  const filteredClauses = useMemo(() => {
    if (!q) return clauses;
    return clauses.filter((c: any) => {
      const cat = String(c?.category || '').toLowerCase();
      const snippet = String(c?.snippet || '').toLowerCase();
      const risk = String(c?.risk || '').toLowerCase();
      return cat.includes(q) || snippet.includes(q) || risk.includes(q);
    });
  }, [clauses, q]);

  const formatMoney = (v: any): string => {
    if (!v) return '';
    const amount = v?.amount ?? v?.value ?? '';
    const currency = v?.currency ?? '';
    const s = String(amount).trim();
    if (!s) return '';
    return currency ? `${s} ${String(currency).toUpperCase()}` : s;
  };

  const partiesChip = useMemo(() => {
    const names = parties
      .map((p: any) => String(p?.name || '').trim())
      .filter(Boolean)
      .slice(0, 3);
    return names.join(', ');
  }, [parties]);

  const effectiveDate = useMemo(() => {
    const d = dates.find((x: any) => String(x?.type || '').toLowerCase().includes('effective'));
    return d?.value || '';
  }, [dates]);

  const endDate = useMemo(() => {
    const d = dates.find((x: any) => String(x?.type || '').toLowerCase().includes('end'));
    return d?.value || '';
  }, [dates]);

  const primaryValue = useMemo(() => {
    const v = values[0];
    return formatMoney(v);
  }, [values]);

  const filteredParties = useMemo(() => {
    if (!q) return parties;
    return parties.filter((p: any) => String(p?.name || '').toLowerCase().includes(q));
  }, [parties, q]);

  const filteredDates = useMemo(() => {
    if (!q) return dates;
    return dates.filter((d: any) => {
      const lv = toLabelValue(d);
      return `${lv.label} ${lv.value}`.toLowerCase().includes(q);
    });
  }, [dates, q]);

  const filteredValues = useMemo(() => {
    if (!q) return values;
    return values.filter((v: any) => JSON.stringify(v || '').toLowerCase().includes(q));
  }, [values, q]);

  const readyLike = item?.status === 'ready';

  const hasAnyStructured = useMemo(() => {
    return (
      summary ||
      parties.length ||
      dates.length ||
      values.length ||
      obligations.length ||
      clauses.length ||
      insights.length ||
      suggestions.length
    );
  }, [summary, parties.length, dates.length, values.length, obligations.length, clauses.length, insights.length, suggestions.length]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => router.push('/review')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="mt-3 text-2xl md:text-3xl font-extrabold text-slate-900 truncate">
              Contract
              <br className="md:hidden" /> Validation
            </h1>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-slate-500">Loading…</div>
        ) : !item ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-slate-500">Not found</div>
        ) : (
          <>
            {/* Toolbar (matches screenshot vibe) */}
            <div className="bg-white rounded-[28px] border border-slate-200 px-4 py-3 md:px-6 md:py-4 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
                  <FileText className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {item.original_filename || item.title}
                  </span>
                  {item.file_type ? (
                    <span className="text-[11px] font-bold text-slate-500">.{String(item.file_type).toLowerCase()}</span>
                  ) : null}
                </div>

                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    value={extractionQuery}
                    onChange={(e) => setExtractionQuery(e.target.value)}
                    placeholder="Search extraction…"
                    className="w-full bg-white border border-slate-200 rounded-full pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {item.status && (
                  <span className={`hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusPill(item.status)}`}>
                    {String(item.status).toUpperCase()}
                  </span>
                )}

                <button
                  type="button"
                  onClick={analyzeNow}
                  disabled={busy || loading}
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  title="Re-run extraction + review"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Re-analyze
                </button>

                <div className="relative" ref={downloadRef}>
                  <button
                    type="button"
                    onClick={() => setDownloadOpen((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0F141F] text-white px-4 py-2 text-sm font-semibold hover:bg-[#0F141F]/90"
                    disabled={busy || loading}
                  >
                    <Download className="w-4 h-4" />
                    Download
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {downloadOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden z-20">
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50"
                        onClick={() => {
                          setDownloadOpen(false);
                          void downloadReport('pdf');
                        }}
                      >
                        Report (PDF)
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50"
                        onClick={() => {
                          setDownloadOpen(false);
                          void downloadReport('txt');
                        }}
                      >
                        Report (TXT)
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50"
                        onClick={() => {
                          setDownloadOpen(false);
                          openOriginal();
                        }}
                        disabled={!fileUrl}
                      >
                        Original file
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={openOriginal}
                  className="hidden md:inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border border-slate-200"
                  aria-label="Open original"
                  disabled={!fileUrl}
                  title="Open original"
                >
                  <Eye className="w-5 h-5 text-slate-700" />
                </button>
              </div>
            </div>

            {/* Mobile extracted data toggle */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExtractedMobile((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Extracted Data
                <ChevronDown className={`w-4 h-4 transition ${showExtractedMobile ? 'rotate-180' : 'rotate-0'}`} />
              </button>
              {readyLike && (
                <Chip tone="emerald">AI Analysis Complete</Chip>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-6">
              {/* Left Panel */}
              <div className={`${showExtractedMobile ? 'block' : 'hidden'} lg:block`}> 
                <div className="bg-white rounded-[28px] border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-slate-900">Analysis &amp; Clauses</div>
                      <div className="text-xs text-slate-500 mt-1">AI review + clause matching</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void downloadReport('pdf')}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700"
                      disabled={busy || loading}
                      title="Export report"
                    >
                      Export Report
                    </button>
                  </div>

                  <div className="mt-4 rounded-3xl bg-slate-50 border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-extrabold text-slate-900">Analysis Summary</div>
                      <Chip tone={(String(analysisSummary?.risk_level || '').toUpperCase() === 'HIGH') ? 'rose' : (String(analysisSummary?.risk_level || '').toUpperCase() === 'MEDIUM') ? 'amber' : 'emerald'}>
                        {String(analysisSummary?.risk_level || 'MEDIUM').toUpperCase()} RISK ({Number(analysisSummary?.risk_score || 0)}/100)
                      </Chip>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        { label: 'CLAUSES', value: Number(analysisSummary?.clauses_count || clauses.length || 0) },
                        { label: 'OBLIGATIONS', value: Number(analysisSummary?.obligations_count || obligations.length || 0) },
                        { label: 'CONSTRAINTS', value: Number(analysisSummary?.constraints_count || constraints.length || 0) },
                      ].map((x) => (
                        <div key={x.label} className="rounded-2xl bg-white border border-slate-200 p-3 text-center">
                          <div className="text-lg font-extrabold text-slate-900">{x.value}</div>
                          <div className="text-[10px] font-bold text-slate-500 mt-1">{x.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!readyLike && (
                    <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
                      <div className="text-sm font-semibold text-amber-900">Analysis pending</div>
                      <div className="text-xs text-amber-800 mt-1">Click “Re-analyze” to run it now.</div>
                    </div>
                  )}

                  {item.status === 'failed' && (
                    <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                        <TriangleAlert className="w-4 h-4" />
                        Review failed
                      </div>
                      <div className="text-xs text-rose-700 mt-2 whitespace-pre-wrap">
                        {item.error_message || 'Unknown error'}
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <div className="text-[11px] font-bold text-slate-500">EXTRACTED DATA</div>
                    <div className="mt-3 flex flex-col gap-2">
                      {partiesChip ? (
                        <Chip tone="violet">Parties: {partiesChip}</Chip>
                      ) : null}
                      {effectiveDate ? (
                        <Chip tone="amber">Eff: {String(effectiveDate)}</Chip>
                      ) : null}
                      {endDate ? (
                        <Chip tone="rose">Exp: {String(endDate)}</Chip>
                      ) : null}
                      {primaryValue ? (
                        <Chip tone="emerald">Value: {primaryValue}</Chip>
                      ) : null}
                      {jurisdiction ? (
                        <Chip tone="violet">Jurisdiction: {jurisdiction}</Chip>
                      ) : null}

                      {!partiesChip && !effectiveDate && !endDate && !primaryValue && !jurisdiction ? (
                        <span className="text-sm text-slate-500">—</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-slate-500">DETECTED CLAUSES</div>
                      <Chip tone="slate">{filteredClauses.length} found</Chip>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500">
                      Match% = cosine similarity between Voyage Law-2 embeddings (detected clause snippet vs library clause).
                    </div>

                    <div className="mt-3 space-y-3">
                      {filteredClauses.length === 0 ? (
                        <div className="text-sm text-slate-500">—</div>
                      ) : (
                        filteredClauses.slice(0, 8).map((c: any, idx: number) => {
                          const category = String(c?.category || 'Clause');
                          const title = String(c?.title || c?.matched_library?.title || category);
                          const snippet = String(c?.snippet || '').trim();
                          const pct = typeof c?.match_percent === 'number' ? c.match_percent : null;
                          const risk = String(c?.risk || c?.matched_library?.default_risk || '').toLowerCase();
                          const tone = risk.includes('high') ? 'rose' : risk.includes('med') ? 'amber' : 'slate';

                          // Pick a related suggestion (simple heuristic)
                          const sug = suggestions.find((s: any) => {
                            const t = `${s?.title || ''} ${s?.text || ''}`.toLowerCase();
                            return t.includes(category.toLowerCase()) || t.includes(title.toLowerCase());
                          });
                          const hasSuggestion = Boolean(sug);
                          return (
                            <button
                              key={idx}
                              type="button"
                              className="w-full text-left rounded-3xl border border-slate-200 p-4 hover:bg-slate-50 transition"
                              onClick={() => {
                                // For now, just scroll the preview into view.
                                const el = document.getElementById('document-preview');
                                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 truncate">{title}</div>
                                  <div className="text-[11px] font-bold text-slate-500 truncate">{category}</div>
                                </div>
                                <Chip tone={tone as any}>{pct != null ? `${pct}% Match` : 'Match'}</Chip>
                              </div>
                              {snippet ? (
                                <div className="text-xs text-slate-600 mt-2 line-clamp-2">{snippet}</div>
                              ) : null}
                              <div className="mt-3 flex items-center justify-between">
                                {hasSuggestion ? (
                                  <span className="text-[11px] font-bold text-rose-600">AI Suggestion</span>
                                ) : (
                                  <span className="text-[11px] font-bold text-slate-500">Detected</span>
                                )}
                                <span className="text-[11px] text-slate-400">View →</span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="text-[11px] font-bold text-slate-500">SUMMARY</div>
                    <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">
                      {summary || '—'}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="text-[11px] font-bold text-slate-500">SUGGESTIONS</div>
                    <div className="mt-3 space-y-3">
                      {suggestions.length === 0 ? (
                        <div className="text-sm text-slate-500">—</div>
                      ) : (
                        suggestions.slice(0, 6).map((s: any, idx: number) => (
                          <div key={idx} className="rounded-3xl border border-rose-100 bg-rose-50/40 p-4">
                            <div className="text-sm font-semibold text-slate-900">{s?.title || 'Suggestion'}</div>
                            <div className="text-xs text-slate-700 mt-2 whitespace-pre-wrap">{s?.text || ''}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel */}
              <div className="space-y-6" id="document-preview">
                <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="font-extrabold text-slate-900">Document Preview</div>
                      <div className="text-xs text-slate-500">{item.file_type?.toLowerCase() === 'pdf' ? 'PDF' : 'Document'}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 inline-flex items-center justify-center"
                        onClick={() => setZoom((z) => Math.max(50, z - 10))}
                        aria-label="Zoom out"
                      >
                        <Minus className="w-4 h-4 text-slate-700" />
                      </button>
                      <div className="text-xs font-bold text-slate-600 w-14 text-center">{zoom}%</div>
                      <button
                        type="button"
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 inline-flex items-center justify-center"
                        onClick={() => setZoom((z) => Math.min(150, z + 10))}
                        aria-label="Zoom in"
                      >
                        <Plus className="w-4 h-4 text-slate-700" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 md:p-6">
                    {!fileUrl ? (
                      <div className="text-sm text-slate-500">No preview URL available.</div>
                    ) : fileText != null ? (
                      <pre className="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-[70vh] overflow-auto">
                        {fileText}
                      </pre>
                    ) : (item.file_type || '').toLowerCase() === 'pdf' ? (
                      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                        {/* Browser PDF viewer doesn't expose zoom reliably; we mimic zoom via CSS scale. */}
                        <div
                          className="origin-top-left"
                          style={{ transform: `scale(${zoom / 100})`, width: `${100 / (zoom / 100)}%` }}
                        >
                          <iframe
                            src={fileUrl}
                            className="w-full h-[72vh]"
                            title="Original Document"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-700">
                        Preview isn’t available for this file type. Use “Original file” from Download.
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-xs text-slate-500">
                        {summary ? 'Summary available' : 'No summary available yet'}
                      </div>
                      {readyLike ? (
                        <Chip tone="emerald">AI Analysis Complete</Chip>
                      ) : (
                        <Chip tone="amber">AI Analysis Pending</Chip>
                      )}
                    </div>
                  </div>
                </div>

                {/* Editor-style extracted review notes */}
                <div className="bg-white rounded-[28px] border border-slate-200 p-6">
                  <div className="font-extrabold text-slate-900">Review Notes (Editor)</div>
                  <div className="text-xs text-slate-500 mt-1">Read-only view of the AI reviewer output</div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm text-slate-800 whitespace-pre-wrap">
                      {item.review_text?.trim() ? item.review_text : '—'}
                    </div>
                  </div>
                  {!hasAnyStructured && (
                    <div className="mt-4 text-sm text-slate-600">
                      No structured extraction found yet. Try “Re-analyze”, or upload a clearer PDF/DOCX.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
