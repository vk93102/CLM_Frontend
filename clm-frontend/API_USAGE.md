# API Client Usage Guide

## Overview
The `ApiClient` class provides a type-safe interface to interact with the CLM backend API. All endpoints are production-ready with no mock data.

**Location:** `/app/lib/api-client.ts`
**Base URL:** `http://127.0.0.1:8000/`

---

## 1. Authentication Endpoints

### 1.1 User Login
```typescript
const client = new ApiClient()
const response = await client.login({
  email: "user@example.com",
  password: "password123"
})

// Response
{
  success: true,
  data: {
    user_id: "uuid",
    email: "user@example.com",
    full_name: "John Doe",
    tenant_id: "uuid",
    access_token: "token...",
    refresh_token: "token..."
  }
}
```

**Usage in Component:**
```typescript
import { useAuth } from '@/app/lib/auth-context'

export default function LoginPage() {
  const { login } = useAuth()
  
  const handleLogin = async (email, password) => {
    await login(email, password)
    // Automatically redirects to dashboard on success
  }
}
```

---

### 1.2 User Registration
```typescript
const client = new ApiClient()
const response = await client.register({
  email: "newuser@example.com",
  password: "password123",
  full_name: "Jane Doe"
})

// Response
{
  success: true,
  data: {
    user_id: "uuid",
    email: "newuser@example.com",
    full_name: "Jane Doe",
    tenant_id: "uuid"
  }
}
```

---

### 1.3 Logout
```typescript
const client = new ApiClient()
await client.logout()

// Clears tokens from localStorage
// Redirects to login page
```

---

### 1.4 Refresh Token
```typescript
const client = new ApiClient()
const response = await client.refreshToken()

// Response: New access token
{
  success: true,
  data: {
    access_token: "new_token..."
  }
}
```

---

## 2. Contract Endpoints

### 2.1 Get All Contracts
```typescript
const client = new ApiClient()
const response = await client.getContracts()

// Response
{
  success: true,
  data: [
    {
      id: "contract_uuid",
      title: "NDA Agreement 2024",
      description: "Non-disclosure agreement",
      status: "approved",
      created_at: "2024-01-10T10:30:00Z",
      updated_at: "2024-01-11T15:45:00Z",
      value: 50000,
      created_by: "user_uuid"
    },
    // ... more contracts
  ]
}
```

**Usage in Component:**
```typescript
export default function ContractsPage() {
  const [contracts, setContracts] = useState([])

  useEffect(() => {
    const loadContracts = async () => {
      const client = new ApiClient()
      const response = await client.getContracts()
      if (response.success) {
        setContracts(response.data)
      }
    }
    loadContracts()
  }, [])

  return (
    <div>
      {contracts.map(contract => (
        <div key={contract.id}>
          <h3>{contract.title}</h3>
          <p>Status: {contract.status}</p>
          <p>Value: ${contract.value}</p>
        </div>
      ))}
    </div>
  )
}
```

---

### 2.2 Get Contract Details
```typescript
const client = new ApiClient()
const response = await client.getContractDetails("contract_uuid")

// Response
{
  success: true,
  data: {
    id: "contract_uuid",
    title: "NDA Agreement 2024",
    description: "Full description here",
    status: "approved",
    content: "Contract full text...",
    clauses: [
      { id: "clause_1", name: "Confidentiality", text: "..." },
      { id: "clause_2", name: "Term", text: "..." }
    ],
    created_at: "2024-01-10T10:30:00Z",
    updated_at: "2024-01-11T15:45:00Z"
  }
}
```

---

### 2.3 Create Contract
```typescript
const client = new ApiClient()
const response = await client.createContract({
  title: "New Service Agreement",
  description: "Service level agreement details",
  status: "draft",
  value: 75000
})

// Response
{
  success: true,
  data: {
    id: "new_contract_uuid",
    title: "New Service Agreement",
    status: "draft",
    created_at: "2024-01-12T12:00:00Z"
  }
}
```

**Usage in Component:**
```typescript
export default function CreateContractPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (formData) => {
    setLoading(true)
    try {
      const client = new ApiClient()
      const response = await client.createContract(formData)
      if (response.success) {
        router.push(`/contracts/${response.data.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      handleSubmit(new FormData(e.target))
    }}>
      {/* Form fields */}
    </form>
  )
}
```

---

### 2.4 Update Contract
```typescript
const client = new ApiClient()
const response = await client.updateContract("contract_uuid", {
  title: "Updated Title",
  status: "pending",
  description: "Updated description"
})

// Response
{
  success: true,
  data: {
    id: "contract_uuid",
    title: "Updated Title",
    status: "pending",
    updated_at: "2024-01-12T14:30:00Z"
  }
}
```

---

### 2.5 Delete Contract
```typescript
const client = new ApiClient()
const response = await client.deleteContract("contract_uuid")

// Response
{
  success: true,
  data: { message: "Contract deleted successfully" }
}
```

---

## 3. Template Endpoints

### 3.1 Get All Templates
```typescript
const client = new ApiClient()
const response = await client.getTemplates()

// Response
{
  success: true,
  data: [
    {
      id: "template_uuid",
      name: "NDA Template",
      contract_type: "NDA",
      description: "Standard NDA template",
      r2_key: "templates/nda_standard.docx",
      merge_fields: ["company_name", "effective_date", "parties"],
      status: "active"
    },
    // ... more templates
  ]
}
```

**Usage in Component:**
```typescript
export default function TemplatesPage() {
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    const loadTemplates = async () => {
      const client = new ApiClient()
      const response = await client.getTemplates()
      if (response.success) {
        setTemplates(response.data)
      }
    }
    loadTemplates()
  }, [])

  return (
    <div className="grid grid-cols-3 gap-4">
      {templates.map(template => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  )
}
```

---

### 3.2 Get Template Details
```typescript
const client = new ApiClient()
const response = await client.getTemplateDetails("template_uuid")

// Response
{
  success: true,
  data: {
    id: "template_uuid",
    name: "NDA Template",
    content: "Full template content...",
    merge_fields: ["company_name", "date"],
    clauses: [/* ... */],
    created_at: "2024-01-01T00:00:00Z"
  }
}
```

---

### 3.3 Create Template
```typescript
const client = new ApiClient()
const response = await client.createTemplate({
  name: "Employment Agreement",
  contract_type: "employment",
  description: "Standard employment contract",
  merge_fields: ["employee_name", "position", "salary"],
  content: "Template content here..."
})

// Response
{
  success: true,
  data: {
    id: "new_template_uuid",
    name: "Employment Agreement",
    created_at: "2024-01-12T12:00:00Z"
  }
}
```

---

## 4. Workflow Endpoints

### 4.1 Get All Workflows
```typescript
const client = new ApiClient()
const response = await client.getWorkflows()

// Response
{
  success: true,
  data: [
    {
      id: "workflow_uuid",
      name: "Contract Approval Workflow",
      description: "Standard approval workflow",
      status: "active",
      steps: [
        {
          step_number: 1,
          name: "Initial Review",
          assigned_to: ["reviewer_id"],
          action_type: "review"
        },
        {
          step_number: 2,
          name: "Legal Review",
          assigned_to: ["legal_id"],
          action_type: "legal_review"
        },
        {
          step_number: 3,
          name: "Final Approval",
          assigned_to: ["manager_id"],
          action_type: "approve"
        }
      ],
      created_at: "2024-01-10T10:00:00Z"
    }
  ]
}
```

---

### 4.2 Get Workflow Details
```typescript
const client = new ApiClient()
const response = await client.getWorkflowDetails("workflow_uuid")

// Response
{
  success: true,
  data: {
    id: "workflow_uuid",
    name: "Contract Approval Workflow",
    // ... all workflow details including steps
  }
}
```

---

## 5. Approval Endpoints

### 5.1 Get All Approvals
```typescript
const client = new ApiClient()
const response = await client.getApprovals()

// Response
{
  success: true,
  data: [
    {
      id: "approval_uuid",
      entity_type: "contract",
      entity_id: "contract_uuid",
      requester_id: "user_uuid",
      status: "pending",
      comment: "Please review this contract",
      priority: "high",
      created_at: "2024-01-12T10:00:00Z",
      updated_at: "2024-01-12T10:00:00Z"
    }
  ]
}
```

**Usage in Component:**
```typescript
export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([])

  useEffect(() => {
    const loadApprovals = async () => {
      const client = new ApiClient()
      const response = await client.getApprovals()
      if (response.success) {
        setApprovals(response.data)
      }
    }
    loadApprovals()
  }, [])

  return (
    <div>
      {approvals.map(approval => (
        <ApprovalCard key={approval.id} approval={approval} />
      ))}
    </div>
  )
}
```

---

### 5.2 Create Approval Request
```typescript
const client = new ApiClient()
const response = await client.createApproval({
  entity_type: "contract",
  entity_id: "contract_uuid",
  priority: "high",
  comment: "Please review and approve this contract"
})

// Response
{
  success: true,
  data: {
    id: "new_approval_uuid",
    status: "pending",
    created_at: "2024-01-12T12:00:00Z"
  }
}
```

---

### 5.3 Update Approval Status
```typescript
const client = new ApiClient()
const response = await client.updateApprovalStatus("approval_uuid", {
  status: "approved",
  comment: "Looks good, approved!"
})

// Or reject
const response = await client.updateApprovalStatus("approval_uuid", {
  status: "rejected",
  comment: "Needs more information before approval"
})

// Response
{
  success: true,
  data: {
    id: "approval_uuid",
    status: "approved",
    updated_at: "2024-01-12T14:30:00Z"
  }
}
```

**Usage in Component:**
```typescript
const handleApprove = async (approvalId) => {
  const client = new ApiClient()
  const response = await client.updateApprovalStatus(approvalId, {
    status: "approved",
    comment: "Approved after review"
  })
  if (response.success) {
    // Refresh approvals list
    loadApprovals()
  }
}
```

---

## 6. Search Endpoints

### 6.1 Search Across All Entities
```typescript
const client = new ApiClient()
const response = await client.search("NDA")

// Response
{
  success: true,
  data: [
    {
      id: "entity_uuid",
      title: "NDA Agreement 2024",
      entity_type: "contract",
      content_preview: "Non-disclosure agreement covering...",
      relevance_score: 0.95
    },
    {
      id: "template_uuid",
      title: "NDA Template",
      entity_type: "template",
      content_preview: "Standard NDA template for...",
      relevance_score: 0.87
    }
  ]
}
```

**Usage in Component:**
```typescript
export default function SearchPage() {
  const [results, setResults] = useState([])
  const [query, setQuery] = useState("")

  const handleSearch = async (searchQuery) => {
    if (searchQuery.length < 2) return
    
    const client = new ApiClient()
    const response = await client.search(searchQuery)
    if (response.success) {
      setResults(response.data)
    }
  }

  return (
    <div>
      <input 
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          handleSearch(e.target.value)
        }}
        placeholder="Search contracts, templates, workflows..."
      />
      {results.map(result => (
        <SearchResult key={result.id} result={result} />
      ))}
    </div>
  )
}
```

---

## 7. Notification Endpoints

### 7.1 Get All Notifications
```typescript
const client = new ApiClient()
const response = await client.getNotifications()

// Response
{
  success: true,
  data: [
    {
      id: "notification_uuid",
      type: "approval_request",
      subject: "New Approval Required",
      message: "Contract NDA-2024 requires your approval",
      read: false,
      created_at: "2024-01-12T14:00:00Z",
      action_url: "/approvals/approval_uuid"
    },
    {
      id: "notification_uuid_2",
      type: "contract_update",
      subject: "Contract Updated",
      message: "Contract NDA-2024 has been updated",
      read: true,
      created_at: "2024-01-12T13:00:00Z",
      action_url: "/contracts/contract_uuid"
    }
  ]
}
```

---

### 7.2 Mark Notification as Read
```typescript
const client = new ApiClient()
const response = await client.markNotificationAsRead("notification_uuid")

// Response
{
  success: true,
  data: {
    id: "notification_uuid",
    read: true
  }
}
```

---

## Error Handling

### Standard Error Response
```typescript
{
  success: false,
  data: null,
  error: "Error message describing what went wrong",
  status: 400 // or 401, 404, 500, etc.
}
```

### Error Handling in Components
```typescript
try {
  const client = new ApiClient()
  const response = await client.getContracts()
  
  if (!response.success) {
    // Handle error
    console.error("Error:", response.error)
    // Show error message to user
    return
  }
  
  // Use response.data
  setContracts(response.data)
} catch (error) {
  console.error("Request failed:", error)
  // Handle network errors or unexpected errors
}
```

---

## Authentication & Authorization

### Automatic Token Management
```typescript
const client = new ApiClient()
// Token is automatically:
// 1. Loaded from localStorage
// 2. Added to Authorization header
// 3. Refreshed on 401 response
// 4. Cleared on logout
```

### Token Storage
- **Access Token**: `localStorage.getItem('access_token')`
- **Refresh Token**: `localStorage.getItem('refresh_token')`

---

## API Response Types

```typescript
interface ApiResponse<T = any> {
  success: boolean      // true if request succeeded
  data?: T              // Response data (if successful)
  error?: string        // Error message (if failed)
  status: number        // HTTP status code
}
```

---

## Best Practices

1. **Always check response.success**
   ```typescript
   if (response.success) {
     // Use response.data
   } else {
     // Handle error
   }
   ```

2. **Handle loading states**
   ```typescript
   const [loading, setLoading] = useState(false)
   setLoading(true)
   try {
     // API call
   } finally {
     setLoading(false)
   }
   ```

3. **Use useAuth hook for authentication**
   ```typescript
   const { user, isAuthenticated, logout } = useAuth()
   ```

4. **Handle errors gracefully**
   ```typescript
   try {
     // API call
   } catch (error) {
     console.error('Error:', error)
     // Show user-friendly error message
   }
   ```

5. **Avoid hardcoding URLs**
   ```typescript
   // Instead, use ApiClient which uses environment variable
   const client = new ApiClient()
   ```

---

## Environment Variables

**.env.local:**
```
NEXT_PUBLIC_API_BASE_URL=https://lawflow-267708864896.asia-south1.run.app
```

The API client reads `NEXT_PUBLIC_API_BASE_URL` (preferred). For backward compatibility it also accepts `NEXT_PUBLIC_API_URL`.

---

**Last Updated:** January 12, 2026
**Status:** Production Ready ✅
