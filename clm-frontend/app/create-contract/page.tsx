'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import {
  ApiClient,
  Clause,
  FileTemplateItem,
  TemplateFileSchemaResponse,
  TemplateSchemaField,
  TemplateSchemaSection,
} from '../lib/api-client';
import DashboardLayout from '../components/DashboardLayout';
import { Bell, ChevronLeft, ChevronRight, FileText, Search, Sparkles, Settings2, ZoomIn, ZoomOut } from 'lucide-react';

// Types
type Template = FileTemplateItem;

type Mode = 'templates' | 'ai';
type AiStep = 'select' | 'edit';

type CustomClause = { title?: string; content: string };
type Constraint = { name: string; value: string };

const STANDARD_TEMPLATES_ORDER = [
  'Mutual_NDA.txt',
  'MSA_Master_Services.txt',
  'SOW_Statement_of_Work.txt',
  'Contractor_Agreement.txt',
];

const TEMPLATE_CARD_META: Record<
  string,
  { title: string; subtitle: string; pill: string; eta: string; iconBg: string; icon: React.ReactNode }
> = {
  'Mutual_NDA.txt': {
    title: 'Mutual NDA',
    subtitle: 'Protect confidential information between two parties.',
    pill: 'Standard',
    eta: '~5 mins',
    iconBg: 'bg-blue-50 text-blue-600',
    icon: <FileText className="w-5 h-5" />,
  },
  'MSA_Master_Services.txt': {
    title: 'MSA (Master Services)',
    subtitle: 'Framework agreement for ongoing service relationships.',
    pill: 'Complex',
    eta: '~15 mins',
    iconBg: 'bg-orange-50 text-orange-600',
    icon: <FileText className="w-5 h-5" />,
  },
  'SOW_Statement_of_Work.txt': {
    title: 'SOW (Statement of Work)',
    subtitle: 'Define specific project deliverables and timelines.',
    pill: 'Project',
    eta: '~10 mins',
    iconBg: 'bg-emerald-50 text-emerald-600',
    icon: <FileText className="w-5 h-5" />,
  },
  'Contractor_Agreement.txt': {
    title: 'Contractor Agreement',
    subtitle: 'Terms for independent contractors and freelancers.',
    pill: 'HR',
    eta: '~8 mins',
    iconBg: 'bg-violet-50 text-violet-600',
    icon: <FileText className="w-5 h-5" />,
  },
};

const CreateContractInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateQuery, setTemplateQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schema, setSchema] = useState<TemplateFileSchemaResponse | null>(null);

  const [clausesLoading, setClausesLoading] = useState(false);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [clauseQuery, setClauseQuery] = useState('');
  const [selectedClauseIds, setSelectedClauseIds] = useState<string[]>([]);

  const [customClauses, setCustomClauses] = useState<CustomClause[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);

  const [previewText, setPreviewText] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);

  const [aiStep, setAiStep] = useState<AiStep>('select');
  const [aiTitle, setAiTitle] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiText, setAiText] = useState('');
  const [aiTemplateQuery, setAiTemplateQuery] = useState('');
  const [aiLoadingTemplate, setAiLoadingTemplate] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const aiEditorRef = useRef<HTMLDivElement | null>(null);

  const cardsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const filename = searchParams.get('template');
    if (filename) setSelectedTemplate(filename);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedTemplate) {
      setSchema(null);
      setFieldValues({});
      setSelectedClauseIds([]);
      setCustomClauses([]);
      setConstraints([]);
      setPreviewText('');

      setAiStep('select');
      setAiTitle('');
      setAiPrompt('');
      setAiText('');
      setAiError(null);
      return;
    }

    const loadSchemaAndClauses = async () => {
      try {
        setSchemaLoading(true);
        const client = new ApiClient();
        const schemaRes = await client.getTemplateFileSchema(selectedTemplate);
        if (!schemaRes.success) {
          setSchema(null);
          return;
        }

        const s = schemaRes.data as any as TemplateFileSchemaResponse;
        setSchema(s);

        // Ensure fieldValues has keys for required schema fields.
        const requiredKeys: string[] = [];
        for (const section of s.sections || []) {
          for (const field of section.fields || []) {
            if (field?.key) requiredKeys.push(field.key);
          }
        }
        setFieldValues((prev) => {
          const next: Record<string, string> = { ...prev };
          for (const k of requiredKeys) {
            if (next[k] === undefined) next[k] = '';
          }
          return next;
        });

        setClausesLoading(true);
        const clausesRes = await client.getClauses({ contract_type: s.template_type });
        if (clausesRes.success) {
          const data: any = clausesRes.data as any;
          const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
          setClauses(list);
        } else {
          setClauses([]);
        }
      } finally {
        setSchemaLoading(false);
        setClausesLoading(false);
      }
    };

    loadSchemaAndClauses();
  }, [selectedTemplate]);

  // Keep the AI editor DOM in sync with aiText.
  useEffect(() => {
    if (mode !== 'ai') return;
    if (aiStep !== 'edit') return;
    if (!aiEditorRef.current) return;
    if (!aiText) {
      aiEditorRef.current.innerText = '';
      return;
    }
    // Only update if it differs to reduce selection jumps.
    if (aiEditorRef.current.innerText !== aiText) {
      aiEditorRef.current.innerText = aiText;
    }
  }, [aiText, aiStep, mode]);

  const startAiBuilder = async () => {
    if (!selectedTemplate) return;
    try {
      setAiError(null);
      setAiLoadingTemplate(true);
      const client = new ApiClient();
      const res = await client.getTemplateFileContent(selectedTemplate);
      if (!res.success) {
        setAiError(res.error || 'Failed to load template');
        return;
      }
      const content = String((res.data as any)?.content || '');
      const name = String((res.data as any)?.name || '') || String(selectedTemplate || 'Template');
      setAiTitle(name);
      setAiText(content);
      setAiStep('edit');
      // Seed prompt to help first-time users.
      if (!aiPrompt.trim()) {
        setAiPrompt('Rewrite the payment terms to Net 45, add a late fee clause, and tighten confidentiality to include trade secrets.');
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to load template');
    } finally {
      setAiLoadingTemplate(false);
    }
  };

  const applyAiPrompt = async () => {
    if (aiGenerating) return;
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setAiError('Please enter a prompt');
      return;
    }
    const current = aiEditorRef.current?.innerText ?? aiText;
    if (!current.trim()) {
      setAiError('Template content is empty');
      return;
    }

    aiAbortRef.current?.abort();
    const aborter = new AbortController();
    aiAbortRef.current = aborter;

    try {
      setAiError(null);
      setAiGenerating(true);
      let nextText = '';

      const client = new ApiClient();
      await client.streamTemplateAiGenerate(
        {
          prompt,
          current_text: current,
          contract_type: schema?.template_type || selectedTemplateObj?.contract_type,
        },
        {
          signal: aborter.signal,
          onDelta: (delta) => {
            nextText += delta;
            setAiText(nextText);
          },
          onDone: () => {
            setAiText(nextText);
          },
          onError: (err) => {
            setAiError(err || 'AI generation failed');
          },
        }
      );
    } catch (e) {
      if ((e as any)?.name === 'AbortError') return;
      setAiError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const stopAi = () => {
    aiAbortRef.current?.abort();
    setAiGenerating(false);
  };

  const createDraftFromAi = async () => {
    try {
      setAiError(null);
      setLoading(true);
      const client = new ApiClient();
      const renderedText = aiEditorRef.current?.innerText ?? aiText;
      const title = (aiTitle || selectedTemplateObj?.name || 'Contract').trim();
      const res = await client.createContractFromContent({
        title,
        contract_type: schema?.template_type || selectedTemplateObj?.contract_type,
        rendered_text: renderedText,
      });
      if (!res.success) {
        setAiError(res.error || 'Failed to create draft');
        return;
      }
      const id = String((res.data as any)?.id || '');
      if (!id) {
        setAiError('Draft created but no contract id returned');
        return;
      }
      router.push(`/contracts/${id}`);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to create draft');
    } finally {
      setLoading(false);
    }
  };

  const filteredClauses = useMemo(() => {
    const list = Array.isArray(clauses) ? clauses : [];
    const q = clauseQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const hay = `${c.clause_id} ${c.name} ${c.content}`.toLowerCase();
      return hay.includes(q);
    });
  }, [clauses, clauseQuery]);

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const client = new ApiClient();
      const templatesResponse = await client.listTemplateFiles();

      if (!templatesResponse.success) {
        setError(templatesResponse.error || 'Failed to load templates');
        setTemplates([]);
      } else {
        const templateList = (templatesResponse.data as any)?.results || [];
        setTemplates(templateList);

        const templateFromQuery = searchParams.get('template');
        if (!templateFromQuery && templateList.length > 0) {
          const firstStandard = templateList.find((t: any) => STANDARD_TEMPLATES_ORDER.includes(t.filename))
          setSelectedTemplate((firstStandard || templateList[0]).filename);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedTemplate || mode !== 'templates') return;
    if (!user) return;

    const timer = window.setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const client = new ApiClient();
        const res = await client.previewContractFromFile({
          filename: selectedTemplate,
          structuredInputs: fieldValues,
          selectedClauses: selectedClauseIds,
          customClauses,
          constraints,
        });
        if (res.success) {
          setPreviewText(((res.data as any)?.rendered_text as string) || '');
        }
      } finally {
        setPreviewLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [selectedTemplate, fieldValues, selectedClauseIds, customClauses, constraints, mode, user]);

  const scrollCards = (dir: 'left' | 'right') => {
    const el = cardsRef.current;
    if (!el) return;
    const delta = dir === 'left' ? -420 : 420;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const setField = (key: string, value: string) => {
    setFieldValues((p) => ({ ...p, [key]: value }));
  };

  const toggleClause = (clauseId: string) => {
    setSelectedClauseIds((prev) =>
      prev.includes(clauseId) ? prev.filter((c) => c !== clauseId) : [...prev, clauseId]
    );
  };

  const addCustomClause = () => setCustomClauses((p) => [...p, { title: '', content: '' }]);
  const addConstraint = () => setConstraints((p) => [...p, { name: '', value: '' }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }

    const templateMetaTitle =
      (selectedTemplate && (TEMPLATE_CARD_META[selectedTemplate]?.title || selectedTemplateObj?.name)) || 'Contract';
    const partyHint =
      fieldValues.party_a_name ||
      fieldValues.party_b_name ||
      fieldValues.company_name ||
      fieldValues.client_name ||
      fieldValues.disclosing_party_name ||
      fieldValues.receiving_party_name ||
      '';
    const derivedTitle = partyHint ? `${templateMetaTitle} — ${partyHint}` : templateMetaTitle;

    setLoading(true);
    setError(null);

    try {
      const client = new ApiClient();
      const response = await client.generateContractFromFile({
        filename: selectedTemplate,
        title: derivedTitle,
        selectedClauses: selectedClauseIds,
        customClauses,
        constraints,
        structuredInputs: fieldValues,
      });

      if (!response.success) {
        setError(response.error || 'Failed to create contract');
        return;
      }

      const contractId = (response.data as any)?.contract?.id;
      if (contractId) {
        router.push(`/contracts/${contractId}`);
      } else {
        router.push('/contracts');
      }
    } catch (err) {
      console.error('Failed to create contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplateObj = templates.find((t) => t.filename === selectedTemplate) || null;

  const standardTemplates = useMemo(() => {
    const map = new Map<string, Template>();
    for (const t of templates) map.set(t.filename, t);
    const ordered = STANDARD_TEMPLATES_ORDER.map((f) => map.get(f)).filter(Boolean) as Template[];
    if (ordered.length) return ordered;
    return templates.slice(0, 4);
  }, [templates]);

  const allTemplatesOrdered = useMemo(() => {
    const standardSet = new Set(STANDARD_TEMPLATES_ORDER);
    const pinned: Template[] = [];
    const byFilename = new Map<string, Template>();
    for (const t of templates) byFilename.set(t.filename, t);
    for (const f of STANDARD_TEMPLATES_ORDER) {
      const t = byFilename.get(f);
      if (t) pinned.push(t);
    }
    const rest = templates.filter((t) => !standardSet.has(t.filename));
    return [...pinned, ...rest];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    if (!q) return allTemplatesOrdered;
    return allTemplatesOrdered.filter((t) => {
      const hay = `${t.filename || ''} ${t.name || ''} ${t.description || ''} ${t.contract_type || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allTemplatesOrdered, templateQuery]);

  const aiFilteredTemplates = useMemo(() => {
    const q = aiTemplateQuery.trim().toLowerCase();
    if (!q) return allTemplatesOrdered.slice(0, 8);
    return allTemplatesOrdered.filter((t) => {
      const hay = `${t.filename || ''} ${t.name || ''} ${t.description || ''} ${t.contract_type || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allTemplatesOrdered, aiTemplateQuery]);

  const sections: TemplateSchemaSection[] = schema?.sections || [];

  const isCreateDisabled = !user || !selectedTemplateObj || loading || mode !== 'templates';

  const pageTitle = 'Contract Generator';
  const pageSubtitle = 'Select a template and autofill details to generate contracts instantly.';

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F2F0EB]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-[28px] md:text-[34px] font-semibold text-[#0F141F] leading-tight">{pageTitle}</h1>
              <p className="text-sm md:text-base text-[#6B7280] mt-1">{pageSubtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="w-10 h-10 rounded-full bg-white shadow-sm border border-black/5 flex items-center justify-center text-[#0F141F]/70 hover:text-[#0F141F]"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="w-10 h-10 rounded-full bg-white shadow-sm border border-black/5 flex items-center justify-center text-[#0F141F]/70 hover:text-[#0F141F]"
                aria-label="Settings"
              >
                <Settings2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="inline-flex items-center rounded-full bg-white border border-black/5 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setMode('templates')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  mode === 'templates' ? 'bg-[#0F141F] text-white' : 'text-[#0F141F]/70 hover:text-[#0F141F]'
                }`}
              >
                Template Based
              </button>
              <button
                type="button"
                onClick={() => setMode('ai')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                  mode === 'ai' ? 'bg-[#0F141F] text-white' : 'text-[#0F141F]/70 hover:text-[#0F141F]'
                }`}
              >
                <Sparkles className="w-4 h-4" /> AI Builder
              </button>
            </div>
          </div>

          {mode === 'ai' ? (
            <div className="mt-8">
              {aiStep === 'select' ? (
                <div className="grid grid-cols-12 gap-6">
                  {/* Template picker (limited width + scrollable) */}
                  <aside className="col-span-12 lg:col-span-3 bg-white rounded-[18px] border border-black/5 shadow-sm overflow-hidden">
                    <div className="px-6 pt-6 pb-4 border-b border-black/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0F141F] text-white flex items-center justify-center">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-[#0F141F]">AI Builder</div>
                          <div className="text-xs text-[#6B7280]">Pick a template to start</div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 bg-[#F6F3ED] rounded-full px-4 py-2">
                        <Search className="w-4 h-4 text-black/35" />
                        <input
                          className="bg-transparent outline-none text-sm w-full"
                          placeholder="Search templates…"
                          value={aiTemplateQuery}
                          onChange={(e) => setAiTemplateQuery(e.target.value)}
                        />
                      </div>

                      <div className="mt-3 text-[11px] text-black/45">
                        {aiTemplateQuery.trim()
                          ? `Showing ${aiFilteredTemplates.length} results`
                          : 'Showing top 8 templates (search to find more)'}
                      </div>
                    </div>

                    <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                      {aiFilteredTemplates.length === 0 ? (
                        <div className="text-sm text-black/45 p-2">No templates match your search.</div>
                      ) : (
                        aiFilteredTemplates.map((t) => {
                          const isSelected = selectedTemplate === t.filename;
                          return (
                            <button
                              key={t.filename}
                              type="button"
                              onClick={() => setSelectedTemplate(t.filename)}
                              className={`w-full text-left rounded-2xl border p-4 transition ${
                                isSelected
                                  ? 'border-[#FF5C7A] bg-[#FFF1F4]'
                                  : 'border-black/5 bg-[#F6F3ED] hover:border-black/10'
                              }`}
                            >
                              <div className="text-sm font-semibold text-[#111827] truncate">{t.name || t.filename}</div>
                              <div className="text-xs text-black/45 mt-1 line-clamp-2">{t.description || t.contract_type || ''}</div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </aside>

                  {/* Main content */}
                  <section className="col-span-12 lg:col-span-9 bg-white rounded-[18px] border border-black/5 shadow-sm p-8">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <div className="text-lg font-semibold text-[#0F141F]">Get Started</div>
                        <div className="text-sm text-[#6B7280] mt-1">Open the template in the editor and apply prompts live.</div>
                      </div>
                      <button
                        type="button"
                        onClick={startAiBuilder}
                        disabled={!selectedTemplate || aiLoadingTemplate}
                        className="h-11 px-5 rounded-full bg-[#0F141F] text-white text-sm font-semibold disabled:opacity-60"
                      >
                        {aiLoadingTemplate ? 'Loading…' : 'Get Started'}
                      </button>
                    </div>

                    {aiError ? (
                      <div className="mt-5 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm">
                        {aiError}
                      </div>
                    ) : null}

                    <div className="mt-6">
                      <div className="text-sm font-semibold text-[#0F141F]">Selected Template</div>
                      <div className="mt-3 rounded-2xl border border-black/5 bg-[#F6F3ED] p-4">
                        <div className="text-sm font-semibold text-[#111827]">
                          {selectedTemplateObj?.name || selectedTemplate || '—'}
                        </div>
                        <div className="text-xs text-black/45 mt-1">
                          {selectedTemplateObj?.description || 'Template preview will open in the editor.'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="text-sm font-semibold text-[#0F141F]">Prompt (optional)</div>
                      <div className="mt-2 text-xs text-black/45">You can refine it later in the editor step.</div>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="e.g., Change payment terms to Net 45, add a late fee clause, and set governing law to Delaware."
                        className="mt-3 w-full min-h-[120px] rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#FF5C7A]/25"
                      />
                    </div>
                  </section>
                </div>
              ) : (
                <div className="bg-[#F2F0EB]">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4 min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          stopAi();
                          setAiStep('select');
                        }}
                        className="w-10 h-10 rounded-full bg-white border border-black/10 shadow-sm grid place-items-center text-black/45 hover:text-black"
                        aria-label="Back"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="min-w-0">
                        <div className="text-xl md:text-2xl font-bold text-[#111827] truncate">
                          {aiTitle || selectedTemplateObj?.name || 'AI Builder'}
                        </div>
                        <div className="text-xs text-black/45 mt-1 truncate">Template: {selectedTemplate || ''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={createDraftFromAi}
                        disabled={loading || aiGenerating || !aiText.trim()}
                        className="h-10 px-4 rounded-full bg-white border border-black/10 text-sm font-semibold text-[#111827] hover:bg-black/5 disabled:opacity-60"
                      >
                        Create Draft
                      </button>
                    </div>
                  </div>

                  {aiError ? (
                    <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm">
                      {aiError}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-12 gap-6">
                    {/* Editor */}
                    <section className="col-span-12 lg:col-span-8 bg-white rounded-[28px] border border-black/5 shadow-sm overflow-hidden">
                      <div className="px-6 pt-5 pb-4 border-b border-black/5 flex items-center justify-between">
                        <div className="text-sm font-semibold text-[#111827]">Template Editor</div>
                        <div className="text-xs text-black/45">
                          {aiGenerating ? 'Applying AI changes…' : 'Preview + edit with prompts'}
                        </div>
                      </div>

                      <div className="px-10 py-10 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                        <div
                          ref={aiEditorRef}
                          contentEditable={!aiGenerating}
                          suppressContentEditableWarning
                          onInput={() => {
                            setAiText(aiEditorRef.current?.innerText || '');
                          }}
                          className={`min-h-[60vh] whitespace-pre-wrap text-[13px] leading-6 text-slate-900 font-serif outline-none ${
                            aiGenerating ? 'opacity-80' : ''
                          }`}
                        />
                      </div>
                    </section>

                    {/* AI Prompt */}
                    <aside className="col-span-12 lg:col-span-4 space-y-6">
                      <div className="bg-white rounded-[28px] border border-black/5 shadow-sm overflow-hidden">
                        <div className="px-6 pt-6 pb-4 border-b border-black/5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-[#111827]">AI Prompts</p>
                            <span className="text-[11px] text-black/45">Streaming</span>
                          </div>
                          <p className="text-xs text-black/45 mt-2">
                            Describe changes and watch them apply in real time.
                          </p>
                        </div>

                        <div className="p-5">
                          <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="e.g., Add a termination for convenience clause with 30 days notice, and update payment terms to Net 45."
                            className="w-full min-h-[140px] rounded-2xl border border-black/10 bg-[#F6F3ED] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#FF5C7A]/25"
                            disabled={aiGenerating}
                          />

                          <div className="mt-4 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={applyAiPrompt}
                              disabled={aiGenerating}
                              className="h-10 px-4 rounded-full bg-[#0F141F] text-white text-sm font-semibold disabled:opacity-60"
                            >
                              {aiGenerating ? 'Generating…' : 'Apply Changes'}
                            </button>
                            {aiGenerating ? (
                              <button
                                type="button"
                                onClick={stopAi}
                                className="h-10 px-4 rounded-full bg-white border border-black/10 text-sm font-semibold text-[#111827] hover:bg-black/5"
                              >
                                Stop
                              </button>
                            ) : null}
                          </div>

                          <div className="mt-4 text-xs text-black/45">
                            Tip: be specific (sections, numbers, jurisdictions).
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#0F141F]">Standard Templates</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollCards('left')}
                      className="w-9 h-9 rounded-lg bg-white border border-black/5 shadow-sm flex items-center justify-center text-[#0F141F]/60 hover:text-[#0F141F]"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCards('right')}
                      className="w-9 h-9 rounded-lg bg-white border border-black/5 shadow-sm flex items-center justify-center text-[#0F141F]/60 hover:text-[#0F141F]"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div
                  ref={cardsRef}
                  className="mt-4 flex gap-4 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none]"
                >
                  <style jsx>{`
                    div::-webkit-scrollbar { display: none; }
                  `}</style>
                  {templatesLoading ? (
                    <div className="text-sm text-[#6B7280] py-6">Loading templates…</div>
                  ) : standardTemplates.length === 0 ? (
                    <div className="text-sm text-[#6B7280] py-6">No templates available</div>
                  ) : (
                    standardTemplates.map((t) => {
                      const isSelected = selectedTemplate === t.filename;
                      const meta = TEMPLATE_CARD_META[t.filename] || {
                        title: t.name,
                        subtitle: t.description || 'Template',
                        pill: 'Standard',
                        eta: '~5 mins',
                        iconBg: 'bg-slate-50 text-slate-700',
                        icon: <FileText className="w-5 h-5" />,
                      };
                      return (
                        <button
                          key={t.filename}
                          type="button"
                          onClick={() => setSelectedTemplate(t.filename)}
                          className={`min-w-[280px] md:min-w-[320px] text-left bg-white rounded-[18px] border shadow-sm p-5 transition ${
                            isSelected
                              ? 'border-[#FF5C7A] ring-2 ring-[#FF5C7A]/20'
                              : 'border-black/5 hover:border-black/10'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center`}>{meta.icon}</div>
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                                isSelected ? 'bg-[#FF5C7A] border-[#FF5C7A]' : 'bg-white border-black/10'
                              }`}
                            >
                              {isSelected ? <div className="w-2.5 h-2.5 rounded-full bg-white" /> : null}
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="font-semibold text-[#0F141F]">{meta.title}</div>
                            <div className="text-sm text-[#6B7280] mt-1">{meta.subtitle}</div>
                          </div>

                          <div className="mt-4 flex items-center gap-2">
                            <span className="text-xs px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#0F141F]/70">
                              {meta.pill}
                            </span>
                            <span className="text-xs text-[#6B7280]">{meta.eta}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-sm font-semibold text-[#0F141F]">All Templates</h2>
                  <div className="flex items-center gap-2 bg-white border border-black/5 shadow-sm rounded-full px-4 py-2 w-full sm:w-[420px]">
                    <Search className="w-4 h-4 text-black/35" />
                    <input
                      value={templateQuery}
                      onChange={(e) => setTemplateQuery(e.target.value)}
                      placeholder="Search templates…"
                      className="bg-transparent outline-none text-sm w-full text-[#0F141F] placeholder:text-black/35"
                      aria-label="Search templates"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  {templatesLoading ? (
                    <div className="text-sm text-[#6B7280] py-6">Loading templates…</div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="text-sm text-[#6B7280] py-6">No templates match your search.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredTemplates.map((t) => {
                        const isSelected = selectedTemplate === t.filename;
                        const meta = TEMPLATE_CARD_META[t.filename] || {
                          title: t.name,
                          subtitle: t.description || 'Template',
                          pill: t.contract_type || 'Template',
                          eta: '~5 mins',
                          iconBg: 'bg-slate-50 text-slate-700',
                          icon: <FileText className="w-5 h-5" />,
                        };

                        const createdByYou =
                          user &&
                          ((t as any)?.created_by_id && String((t as any).created_by_id) === String((user as any)?.user_id));

                        return (
                          <button
                            key={t.filename}
                            type="button"
                            onClick={() => setSelectedTemplate(t.filename)}
                            className={`text-left bg-white rounded-[18px] border shadow-sm p-5 transition w-full ${
                              isSelected
                                ? 'border-[#FF5C7A] ring-2 ring-[#FF5C7A]/20'
                                : 'border-black/5 hover:border-black/10'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center flex-shrink-0`}>{meta.icon}</div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-semibold text-[#0F141F] truncate">{meta.title}</div>
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center border flex-shrink-0 ${
                                      isSelected ? 'bg-[#FF5C7A] border-[#FF5C7A]' : 'bg-white border-black/10'
                                    }`}
                                  >
                                    {isSelected ? <div className="w-2.5 h-2.5 rounded-full bg-white" /> : null}
                                  </div>
                                </div>
                                <div className="text-sm text-[#6B7280] mt-1 line-clamp-2">{meta.subtitle}</div>
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#0F141F]/70">
                                    {meta.pill}
                                  </span>
                                  {createdByYou ? (
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#F6F3ED] text-[#0F141F]/70 border border-black/5">
                                      Mine
                                    </span>
                                  ) : null}
                                  <span className="text-[11px] text-[#6B7280] truncate">{t.filename}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl">
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Data Entry */}
                <div className="bg-white rounded-[18px] border border-black/5 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#FF5C7A] text-white flex items-center justify-center text-xs font-bold">1</div>
                      <div className="font-semibold text-[#0F141F]">Data Entry</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFieldValues({});
                        setSelectedClauseIds([]);
                        setCustomClauses([]);
                        setConstraints([]);
                      }}
                      className="text-xs text-[#FF5C7A] hover:underline"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="p-5 space-y-6">
                    {!selectedTemplate ? (
                      <div className="text-sm text-[#6B7280]">Select a template to begin.</div>
                    ) : schemaLoading ? (
                      <div className="text-sm text-[#6B7280]">Loading required fields…</div>
                    ) : (
                      <>
                        {(sections.length ? sections : [{ title: 'Data Entry', fields: [] }]).map((section) => (
                          <div key={section.title}>
                            <div className="text-[11px] tracking-wider text-[#9CA3AF] font-semibold uppercase">{section.title}</div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(section.fields || []).map((f: TemplateSchemaField) => (
                                <div key={f.key} className={f.type === 'select' ? 'md:col-span-1' : ''}>
                                  <label className="block text-sm font-medium text-[#374151] mb-2">
                                    {f.label} {f.required ? <span className="text-[#FF5C7A]">*</span> : null}
                                  </label>
                                  {f.type === 'select' ? (
                                    <select
                                      value={fieldValues[f.key] || ''}
                                      onChange={(e) => setField(f.key, e.target.value)}
                                      className="w-full px-4 py-3 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40"
                                    >
                                      <option value="">Select…</option>
                                      {(f.options || []).map((o) => (
                                        <option key={o} value={o}>
                                          {o}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type={f.type}
                                      value={fieldValues[f.key] || ''}
                                      onChange={(e) => setField(f.key, e.target.value)}
                                      className="w-full px-4 py-3 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40"
                                      placeholder={f.label}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Clauses & Constraints */}
                        <div>
                          <div className="text-[11px] tracking-wider text-[#9CA3AF] font-semibold uppercase">Clause & Constraints</div>
                          <div className="mt-3 space-y-4">
                            <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-black/5">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-[#111827] text-sm">Clause Library</div>
                                <div className="text-xs text-[#6B7280]">Optional</div>
                              </div>
                              <div className="mt-3">
                                <input
                                  value={clauseQuery}
                                  onChange={(e) => setClauseQuery(e.target.value)}
                                  placeholder="Search clauses…"
                                  className="w-full px-4 py-2.5 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40"
                                />
                              </div>
                              <div className="mt-3 max-h-44 overflow-y-auto space-y-2 pr-1">
                                {clausesLoading ? (
                                  <div className="text-sm text-[#6B7280]">Loading clauses…</div>
                                ) : filteredClauses.length === 0 ? (
                                  <div className="text-sm text-[#6B7280]">No clauses found.</div>
                                ) : (
                                  filteredClauses.slice(0, 50).map((c) => {
                                    const checked = selectedClauseIds.includes(c.clause_id);
                                    return (
                                      <label
                                        key={`${c.clause_id}-${c.version}`}
                                        className="flex items-start gap-3 bg-white rounded-xl border border-black/5 p-3 cursor-pointer hover:border-black/10"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleClause(c.clause_id)}
                                          className="mt-1"
                                        />
                                        <div className="min-w-0">
                                          <div className="text-sm font-semibold text-[#111827] truncate">{c.name}</div>
                                          <div className="text-xs text-[#6B7280]">{c.clause_id}</div>
                                        </div>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-black/5">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-[#111827] text-sm">Constraints</div>
                                <button
                                  type="button"
                                  onClick={addConstraint}
                                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-black/10 hover:border-black/20"
                                >
                                  Add
                                </button>
                              </div>
                              <div className="mt-3 space-y-3">
                                {constraints.length === 0 ? (
                                  <div className="text-sm text-[#6B7280]">Add constraints like jurisdiction, data residency, liability caps, etc.</div>
                                ) : (
                                  constraints.map((c, idx) => (
                                    <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <input
                                        value={c.name}
                                        onChange={(e) =>
                                          setConstraints((p) => p.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                                        }
                                        placeholder="Constraint name"
                                        className="w-full px-4 py-2.5 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40"
                                      />
                                      <div className="flex gap-2">
                                        <input
                                          value={c.value}
                                          onChange={(e) =>
                                            setConstraints((p) => p.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)))
                                          }
                                          placeholder="Value"
                                          className="flex-1 px-4 py-2.5 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setConstraints((p) => p.filter((_, i) => i !== idx))}
                                          className="px-3 py-2.5 rounded-xl bg-white border border-black/10 hover:border-black/20 text-[#6B7280]"
                                          aria-label="Remove constraint"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-black/5">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-[#111827] text-sm">Custom Clauses</div>
                                <button
                                  type="button"
                                  onClick={addCustomClause}
                                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-black/10 hover:border-black/20"
                                >
                                  Add
                                </button>
                              </div>
                              <div className="mt-3 space-y-3">
                                {customClauses.length === 0 ? (
                                  <div className="text-sm text-[#6B7280]">Add custom clauses like non-solicit, security, SLA, etc.</div>
                                ) : (
                                  customClauses.map((c, idx) => (
                                    <div key={idx} className="bg-white rounded-2xl border border-black/5 p-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <input
                                          value={c.title || ''}
                                          onChange={(e) =>
                                            setCustomClauses((p) => p.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))
                                          }
                                          placeholder="Clause title"
                                          className="flex-1 px-4 py-2.5 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setCustomClauses((p) => p.filter((_, i) => i !== idx))}
                                          className="px-3 py-2.5 rounded-xl bg-white border border-black/10 hover:border-black/20 text-[#6B7280]"
                                          aria-label="Remove custom clause"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                      <textarea
                                        value={c.content}
                                        onChange={(e) =>
                                          setCustomClauses((p) => p.map((x, i) => (i === idx ? { ...x, content: e.target.value } : x)))
                                        }
                                        placeholder="Write clause content…"
                                        className="mt-3 w-full px-4 py-3 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40 min-h-[96px]"
                                      />
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Live Preview */}
                <div className="bg-white rounded-[18px] border border-black/5 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-[#6B7280] font-semibold">Live Preview</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewZoom((z) => Math.max(0.8, Math.round((z - 0.1) * 10) / 10))}
                        className="w-9 h-9 rounded-lg bg-[#F7F7F7] border border-black/5 flex items-center justify-center text-[#0F141F]/70 hover:text-[#0F141F]"
                        aria-label="Zoom out"
                      >
                        <ZoomOut className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewZoom((z) => Math.min(1.3, Math.round((z + 0.1) * 10) / 10))}
                        className="w-9 h-9 rounded-lg bg-[#F7F7F7] border border-black/5 flex items-center justify-center text-[#0F141F]/70 hover:text-[#0F141F]"
                        aria-label="Zoom in"
                      >
                        <ZoomIn className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="bg-[#EEF0F3] rounded-[18px] p-4">
                      <div className="bg-white rounded-[14px] shadow-sm border border-black/5 overflow-hidden">
                        <div className="p-6 max-h-[560px] overflow-y-auto" style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top left' }}>
                          {previewLoading ? (
                            <div className="text-sm text-[#6B7280]">Generating preview…</div>
                          ) : !selectedTemplate ? (
                            <div className="text-sm text-[#6B7280]">Select a template to preview.</div>
                          ) : previewText ? (
                            <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#111827] font-serif">
                              {previewText}
                            </pre>
                          ) : (
                            <div className="text-sm text-[#6B7280]">Start filling fields to see a preview.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-4">
                      <div className="text-sm text-[#6B7280]">
                        {!user ? 'Please log in to create contracts.' : schema?.template_type ? `Type: ${schema.template_type}` : null}
                      </div>
                      <button
                        type="submit"
                        disabled={isCreateDisabled}
                        className="bg-[#0F141F] text-white px-7 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Creating…' : 'Create Contract'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

const CreateContractPage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F2F0EB] p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-[20px] shadow-sm p-6 text-gray-600">
              Loading...
            </div>
          </div>
        </div>
      }
    >
      <CreateContractInner />
    </Suspense>
  );
};

export default CreateContractPage;