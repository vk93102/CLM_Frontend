'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/auth-context'
import {
  templateAPI,
  tokenManager,
  TemplateTypeInfo,
  TemplateCreateRequest,
} from '@/app/lib/api'
import { 
  FileText, 
  Plus, 
  Search, 
  Eye, 
  Download, 
  X, 
  CheckCircle, 
  AlertCircle,
  FileCheck,
  Briefcase,
  Users,
  Home,
  ShoppingCart,
  Shield,
  FileSignature,
  Loader2
} from 'lucide-react'

const TEMPLATE_TYPES = [
  'NDA',
  'MSA',
  'EMPLOYMENT',
  'SERVICE_AGREEMENT',
  'AGENCY_AGREEMENT',
  'PROPERTY_MANAGEMENT',
  'PURCHASE_AGREEMENT',
] as const

type TemplateType = typeof TEMPLATE_TYPES[number]

const templateIcons: Record<string, any> = {
  NDA: Shield,
  MSA: FileSignature,
  EMPLOYMENT: Users,
  SERVICE_AGREEMENT: Briefcase,
  AGENCY_AGREEMENT: FileCheck,
  PROPERTY_MANAGEMENT: Home,
  PURCHASE_AGREEMENT: ShoppingCart,
}

const templateColors: Record<string, string> = {
  NDA: 'from-blue-500 to-blue-600',
  MSA: 'from-purple-500 to-purple-600',
  EMPLOYMENT: 'from-green-500 to-green-600',
  SERVICE_AGREEMENT: 'from-orange-500 to-orange-600',
  AGENCY_AGREEMENT: 'from-pink-500 to-pink-600',
  PROPERTY_MANAGEMENT: 'from-indigo-500 to-indigo-600',
  PURCHASE_AGREEMENT: 'from-red-500 to-red-600',
}

export default function TemplatesPageNew() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const [templateTypes, setTemplateTypes] = useState<Record<string, TemplateTypeInfo>>({})
  const [createdTemplates, setCreatedTemplates] = useState<any[]>([])
  const [selectedType, setSelectedType] = useState<TemplateType | null>(null)
  const [selectedTypeDetail, setSelectedTypeDetail] = useState<TemplateTypeInfo | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft' as 'draft' | 'published',
    data: {} as Record<string, any>,
  })
  
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData()
    }
  }, [isAuthenticated])

  const loadAllData = async () => {
    await Promise.all([
      fetchTemplateTypes(),
      fetchCreatedTemplates()
    ])
  }

  const fetchTemplateTypes = async () => {
    try {
      setIsLoading(true)
      const token = tokenManager.getAccessToken()
      if (!token) return

      const response = await templateAPI.getAllTemplateTypes(token)
      setTemplateTypes(response.template_types)
    } catch (err: any) {
      setError(err.message || 'Failed to load template types')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCreatedTemplates = async () => {
    try {
      const token = tokenManager.getAccessToken()
      if (!token) return

      const templates = await templateAPI.getTemplates(token)
      setCreatedTemplates(templates)
    } catch (err: any) {
      console.error('Failed to load created templates:', err)
    }
  }

  const handleTemplateTypeClick = async (templateType: TemplateType) => {
    try {
      setError('')
      const token = tokenManager.getAccessToken()
      if (!token) return

      const detail = await templateAPI.getTemplateTypeDetail(token, templateType)
      setSelectedTypeDetail(detail)
      setShowDetailModal(true)
    } catch (err: any) {
      setError(err.message || 'Failed to load template details')
    }
  }

  const handleCreateFromType = (templateType: TemplateType) => {
    const typeInfo = templateTypes[templateType]
    if (!typeInfo) return

    const initialData: Record<string, any> = {}
    typeInfo.required_fields.forEach((field) => {
      initialData[field.name] = typeInfo.sample_data?.[field.name] || ''
    })

    setSelectedType(templateType)
    setSelectedTypeDetail(typeInfo)
    setFormData({
      name: '',
      description: '',
      status: 'draft',
      data: initialData,
    })
    setValidationErrors([])
    setShowDetailModal(false)
    setShowCreateModal(true)
  }

  const validateTemplateData = async (): Promise<boolean> => {
    if (!selectedType) return false

    try {
      setIsValidating(true)
      setValidationErrors([])
      const token = tokenManager.getAccessToken()
      if (!token) return false

      const response = await templateAPI.validateTemplateData(token, {
        template_type: selectedType,
        data: formData.data,
      })

      if (!response.is_valid) {
        setValidationErrors(response.missing_fields)
        return false
      }

      return true
    } catch (err: any) {
      setError(err.message || 'Validation failed')
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedType) {
      setError('No template type selected')
      return
    }

    setError('')
    setSuccessMessage('')

    const isValid = await validateTemplateData()
    if (!isValid) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setIsCreating(true)
      const token = tokenManager.getAccessToken()
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await templateAPI.createTemplateFromType(token, {
        template_type: selectedType,
        name: formData.name,
        description: formData.description,
        status: formData.status,
        data: formData.data,
      })

      setSuccessMessage(`Template "${response.name}" created successfully!`)
      setShowCreateModal(false)
      
      await fetchCreatedTemplates()
      
      setFormData({
        name: '',
        description: '',
        status: 'draft',
        data: {},
      })
      setSelectedType(null)
      
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to create template')
    } finally {
      setIsCreating(false)
    }
  }

  const handlePreview = async (template: any) => {
    setPreviewTemplate(template)
    setShowPreviewModal(true)
  }

  const handleDownload = async (template: any) => {
    try {
      const token = tokenManager.getAccessToken()
      if (!token) return

      const content = `Template: ${template.name}\n\nType: ${template.contract_type}\n\nDescription: ${template.description || 'N/A'}\n\nContent:\n${JSON.stringify(template, null, 2)}`
      
      const blob = new Blob([content], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.name.replace(/\s+/g, '_')}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      setSuccessMessage('Template downloaded successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to download template')
    }
  }

  const filteredTypes = TEMPLATE_TYPES.filter(type => {
    const typeInfo = templateTypes[type]
    if (!typeInfo) return false
    return typeInfo.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           typeInfo.description.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const filteredCreatedTemplates = createdTemplates.filter(template => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.contract_type?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Template Repository</h1>
              <p className="text-sm text-gray-500 mt-1">
                View and manage all active agreements across the organization
              </p>
            </div>
            <button
              onClick={() => {
                // Auto-select first template type for creation
                if (TEMPLATE_TYPES.length > 0) {
                  handleCreateFromType(TEMPLATE_TYPES[0])
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:shadow-lg transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, counterparty, or ID..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Advanced Filters
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Connection Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <p className="text-xs text-red-600 mt-2">Please ensure the backend server is running on port 8000</p>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Success</p>
                <p className="text-sm text-green-700 mt-1">{successMessage}</p>
              </div>
              <button onClick={() => setSuccessMessage('')} className="text-green-400 hover:text-green-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Template Types Grid */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTypes.map((type) => {
              const typeInfo = templateTypes[type]
              if (!typeInfo) return null

              const Icon = templateIcons[type] || FileText
              const colorClass = templateColors[type]

              return (
                <div
                  key={type}
                  onClick={() => handleTemplateTypeClick(type)}
                  className="relative bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCreateFromType(type)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    {typeInfo.display_name}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                    {typeInfo.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      {typeInfo.required_fields.length} fields
                    </span>
                    <span className="text-pink-600 font-medium opacity-0 group-hover:opacity-100 transition">
                      View →
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Created Templates Section */}
        {createdTemplates.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing {filteredCreatedTemplates.length} of {createdTemplates.length} templates
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Template Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCreatedTemplates.map((template) => {
                    const Icon = templateIcons[template.contract_type?.toUpperCase()] || FileText
                    const colorClass = templateColors[template.contract_type?.toUpperCase()] || 'from-gray-500 to-gray-600'
                    
                    // Status badge styling
                    const statusStyles = {
                      'published': 'bg-green-100 text-green-700',
                      'active': 'bg-green-100 text-green-700',
                      'draft': 'bg-yellow-100 text-yellow-700',
                      'review': 'bg-orange-100 text-orange-700',
                      'expired': 'bg-red-100 text-red-700',
                      'archived': 'bg-gray-100 text-gray-700',
                    }
                    
                    return (
                      <tr key={template.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 bg-gradient-to-br ${colorClass} rounded flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{template.name}</div>
                              <div className="text-xs text-gray-500">
                                ID: {template.id?.toString().substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusStyles[template.status as keyof typeof statusStyles] || statusStyles.draft
                          }`}>
                            {template.status || 'Draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                              <Users className="w-3 h-3 text-gray-600" />
                            </div>
                            <span className="text-sm text-gray-900">System</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {template.created_at ? new Date(template.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handlePreview(template)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(template)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 transition bg-pink-500 text-white border-pink-500">
                  1
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 transition">
                  2
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 transition">
                  3
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Detail Modal */}
      {showDetailModal && selectedTypeDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h2 className="text-xl font-bold">{selectedTypeDetail.display_name}</h2>
                <p className="text-pink-100 text-sm mt-1">{selectedTypeDetail.description}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 hover:bg-white/20 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Contract Type
                </h3>
                <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-pink-100 text-pink-800 text-sm font-medium">
                  {selectedTypeDetail.contract_type}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Required Fields ({selectedTypeDetail.required_fields.length})
                </h3>
                <div className="space-y-2">
                  {selectedTypeDetail.required_fields.map((field, index) => (
                    <div key={index} className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                      <div className="flex items-start gap-2">
                        <span className="text-red-600 font-bold text-sm">*</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{field.name}</div>
                          <div className="text-xs text-gray-600 mt-1">{field.description}</div>
                          <div className="text-xs text-gray-500 mt-1">Type: {field.type}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTypeDetail.optional_fields.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Optional Fields ({selectedTypeDetail.optional_fields.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedTypeDetail.optional_fields.map((field, index) => (
                      <div key={index} className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                        <div className="font-medium text-gray-900 text-sm">{field.name}</div>
                        <div className="text-xs text-gray-600 mt-1">{field.description}</div>
                        <div className="text-xs text-gray-500 mt-1">Type: {field.type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTypeDetail.mandatory_clauses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Mandatory Clauses ({selectedTypeDetail.mandatory_clauses.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedTypeDetail.mandatory_clauses.map((clause, index) => (
                      <div key={index} className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-gray-900 font-medium text-sm">{clause}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  if (selectedType) handleCreateFromType(selectedType)
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-medium hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Template
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && selectedType && selectedTypeDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h2 className="text-xl font-bold">Create {selectedTypeDetail.display_name}</h2>
                <p className="text-pink-100 text-sm mt-1">Fill in the required information</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 hover:bg-white/20 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Basic Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Template Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., Standard NDA Template"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                      placeholder="Brief description of this template..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Template Data</h3>
                
                <div className="space-y-4">
                  {selectedTypeDetail.required_fields.map((field, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {field.name} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.data[field.name] || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          data: { ...formData.data, [field.name]: e.target.value }
                        })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        placeholder={field.description}
                      />
                      <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="mb-6">
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800 mb-2">Missing Required Fields:</p>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                          {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3">
              <button
                type="submit"
                disabled={isCreating || isValidating}
                onClick={handleCreateTemplate}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Create Template
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={isCreating}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h2 className="text-xl font-bold">{previewTemplate.name}</h2>
                <p className="text-pink-100 text-sm mt-1">Template Preview</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 hover:bg-white/20 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Template Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium text-gray-900">{previewTemplate.contract_type}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className={`ml-2 font-medium ${
                        previewTemplate.status === 'published' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {previewTemplate.status}
                      </span>
                    </div>
                    {previewTemplate.created_at && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Created:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {new Date(previewTemplate.created_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {previewTemplate.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 border border-gray-200">
                      {previewTemplate.description}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Template Data</h3>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(previewTemplate, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => handleDownload(previewTemplate)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
