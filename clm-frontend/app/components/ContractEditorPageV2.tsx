'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from './DashboardLayout';
import { ApiClient, Contract } from '@/app/lib/api-client';

type ClauseCard = {
  id: string;
  clause_id?: string;
  name?: string;
  content?: string;
};

const ContractEditorPageV2: React.FC = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const contractId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [clauses, setClauses] = useState<ClauseCard[]>([]);
  const [clauseSearch, setClauseSearch] = useState('');

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!contractId) return;
      try {
        setLoading(true);
        setError(null);
        const client = new ApiClient();
        const res = await client.getContractById(contractId);
        if (!alive) return;

        if (res.success) {
          setContract(res.data as any);
        } else {
          setError(res.error || 'Failed to load contract');
        }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Failed to load contract');
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [contractId]);

  useEffect(() => {
    let alive = true;
    async function loadClauses() {
      try {
        const client = new ApiClient();
        const res = await client.getClauses();
        if (!alive) return;
        if (res.success) {
          const list = Array.isArray(res.data)
            ? (res.data as any[])
            : ((res.data as any)?.results || []);
          setClauses(list);
        } else {
          setClauses([]);
        }
      } catch {
        if (!alive) return;
        setClauses([]);
      }
    }
    loadClauses();
    return () => {
      alive = false;
    };
  }, []);

  const title = (contract as any)?.title || (contract as any)?.name || 'Contract';
  const updatedAt = (contract as any)?.updated_at ? new Date((contract as any).updated_at).toLocaleString() : null;
  const renderedText =
    (contract as any)?.rendered_text ||
    (contract as any)?.metadata?.rendered_text ||
    '';

  const filteredClauses = useMemo(() => {
    const q = clauseSearch.trim().toLowerCase();
    if (!q) return clauses;
    return clauses.filter((c) => {
      const hay = `${c.clause_id || ''} ${c.name || ''} ${c.content || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [clauses, clauseSearch]);

  return (
    <DashboardLayout>
      <div className="bg-[#F2F0EB]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-white border border-black/10 shadow-sm grid place-items-center text-black/45 hover:text-black"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-[#111827] truncate">{title}</h1>
                {updatedAt && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-black/45 font-medium">Updated {updatedAt}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-black/40 mt-1 truncate">Contract ID: {String(contractId || '')}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Clause Library */}
          <aside className="col-span-12 lg:col-span-3 bg-white rounded-[28px] border border-black/5 shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-black/5">
              <p className="text-sm font-semibold text-[#111827]">Clause Library</p>
              <div className="mt-3 flex items-center gap-2 bg-[#F6F3ED] rounded-full px-4 py-2">
                <svg className="w-4 h-4 text-black/35" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  className="bg-transparent outline-none text-sm w-full"
                  placeholder="Search clauses..."
                  value={clauseSearch}
                  onChange={(e) => setClauseSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 space-y-4">
              {filteredClauses.length === 0 ? (
                <div className="text-sm text-black/45 p-2">No clauses available.</div>
              ) : (
                filteredClauses.slice(0, 20).map((c) => (
                  <div key={c.id} className="rounded-2xl border border-black/5 bg-[#F6F3ED] p-4">
                    <p className="text-[10px] tracking-wider font-bold text-[#FF5C7A]">{c.clause_id || 'CLAUSE'}</p>
                    <p className="text-sm font-semibold text-[#111827] mt-1">{c.name || 'Untitled clause'}</p>
                    {c.content && <p className="text-xs text-black/45 mt-2 leading-relaxed line-clamp-3">{c.content}</p>}
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Editor */}
          <section className="col-span-12 lg:col-span-6 bg-white rounded-[28px] border border-black/5 shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-black/45">
                {['B', 'I', 'U'].map((x) => (
                  <button key={x} className="w-9 h-9 rounded-xl hover:bg-black/5 text-sm font-semibold">
                    {x}
                  </button>
                ))}
                <button className="w-9 h-9 rounded-xl hover:bg-black/5" aria-label="Bullets">
                  <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                </button>
              </div>
              <button className="w-10 h-10 rounded-full hover:bg-black/5 text-black/45" aria-label="More">
                <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            </div>

            <div className="px-10 py-10 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
              {loading ? (
                <div className="text-sm text-black/45">Loading contract…</div>
              ) : renderedText ? (
                <pre className="whitespace-pre-wrap text-[13px] leading-6 text-slate-900 font-serif">
                  {renderedText}
                </pre>
              ) : (
                <div className="text-sm text-black/45">No rendered content available for this contract.</div>
              )}
            </div>
          </section>

          {/* Collaboration */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            <div className="bg-white rounded-[28px] border border-black/5 shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-black/5">
                <p className="text-sm font-semibold text-[#111827]">Collaboration</p>
              </div>
              <div className="p-5">
                <div className="text-sm text-black/45">No collaboration activity yet.</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ContractEditorPageV2;
