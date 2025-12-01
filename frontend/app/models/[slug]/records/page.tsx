'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { getWorkspaceId, storeWorkspaceId, subscribe } from '@/lib/workspace-store'

interface ModelField {
  id: number
  name: string
  slug: string
  data_type: string
  is_required?: boolean
  is_unique?: boolean
  config?: { options?: string[]; values?: string[] } | null
}

interface ModelDefinition {
  id: number
  name: string
  slug: string
  fields: ModelField[]
  created_at?: string
}

interface RecordRow {
  id: number
  data: Record<string, any>
  created_at: string
  updated_at: string
}

const fieldValue = (value: any, field: ModelField) => {
  if (value === undefined || value === null) return '—'
  if (field.data_type === 'boolean') return value ? 'Yes' : 'No'
  if (field.data_type === 'date') return new Date(value).toLocaleDateString()
  if (field.data_type === 'datetime') return new Date(value).toLocaleString()
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

const getOptions = (field: ModelField) => field.config?.options || field.config?.values || []

const FieldInput = ({
  field,
  value,
  onChange
}: {
  field: ModelField
  value: any
  onChange: (val: any) => void
}) => {
  const common = 'bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 w-full'
  switch (field.data_type) {
    case 'boolean':
      return (
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-brand-500"
          />
          {field.name}
        </label>
      )
    case 'text':
      return (
        <textarea
          className={`${common} min-h-[120px]`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'enum': {
      const options = getOptions(field)
      return (
        <select className={common} value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select {field.name}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )
    }
    case 'number':
      return (
        <input
          type="number"
          className={common}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      )
    case 'date':
      return (
        <input
          type="date"
          className={common}
          value={value ? new Date(value).toISOString().substring(0, 10) : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'datetime':
      return (
        <input
          type="datetime-local"
          className={common}
          value={value ? new Date(value).toISOString().slice(0, 16) : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    default:
      return (
        <input
          type="text"
          className={common}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

export default function RecordsPage() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const slug = params?.slug
  const [workspaceId, setWorkspaceId] = useState<number>(() => {
    const fromQuery = Number(searchParams.get('ws') ?? searchParams.get('org'))
    if (Number.isFinite(fromQuery) && fromQuery > 0) return fromQuery
    return getWorkspaceId() || 1
  })

  const [model, setModel] = useState<ModelDefinition | null>(null)
  const [records, setRecords] = useState<RecordRow[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string | null>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterKey, setFilterKey] = useState('')
  const [filterValue, setFilterValue] = useState<any>('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showNewRecord, setShowNewRecord] = useState(false)
  const [newRecord, setNewRecord] = useState<Record<string, any>>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingData, setEditingData] = useState<Record<string, any>>({})
  const [hasMore, setHasMore] = useState(false)
  const [usageEstimate, setUsageEstimate] = useState(0)
  const planLimit = 500

  const updateWorkspace = (value: number) => {
    const normalized = Number.isFinite(value) && value > 0 ? value : 1
    setWorkspaceId(normalized)
    storeWorkspaceId(normalized)
  }

  const displayRecords = useMemo(() => {
    if (!search.trim()) return records
    return records.filter((record) =>
      Object.values(record.data || {}).some((value) =>
        String(value).toLowerCase().includes(search.toLowerCase())
      )
    )
  }, [records, search])

  const fetchModel = async () => {
    if (!slug) return
    setError('')
    try {
      const res = await api.get<ModelDefinition[]>('/models', {
        params: { workspace_id: workspaceId }
      })
      const found = res.data.find((m) => m.slug === slug)
      if (!found) {
        setError('Model not found for this workspace')
        setModel(null)
        return
      }
      setModel(found)
    } catch (err) {
      setError('Unable to load model definition')
      setModel(null)
    }
  }

  const fetchRecords = async (modelId: number, options?: { resetPage?: boolean }) => {
    if (options?.resetPage) setPage(0)
    setLoading(true)
    setError('')
    try {
      const res = await api.get<RecordRow[]>(`/models/${modelId}/records`, {
        params: {
          skip: (options?.resetPage ? 0 : page * pageSize),
          limit: pageSize,
          sort_by: sortBy || undefined,
          sort_order: sortOrder,
          filter_key: filterKey || undefined,
          filter_value: filterValue || undefined
        }
      })
      setRecords(res.data)
      setHasMore(res.data.length === pageSize)
      setUsageEstimate((page * pageSize) + res.data.length)
    } catch (err) {
      setError('Unable to load records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchModel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, workspaceId])

  useEffect(() => {
    const fromQuery = Number(searchParams.get('ws') ?? searchParams.get('org'))
    if (Number.isFinite(fromQuery) && fromQuery > 0 && fromQuery !== workspaceId) {
      updateWorkspace(fromQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    const unsubscribe = subscribe((id) => {
      if (id && id !== workspaceId) {
        setWorkspaceId(id)
      }
    })
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  useEffect(() => {
    if (model?.id) {
      fetchRecords(model.id, { resetPage: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.id, sortBy, sortOrder, filterKey, filterValue, pageSize])

  useEffect(() => {
    if (model?.id) {
      fetchRecords(model.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const submitNewRecord = async () => {
    if (!model) return
    setLoading(true)
    setError('')
    try {
      await api.post(`/models/${model.id}/records`, { data: newRecord })
      setShowNewRecord(false)
      setNewRecord({})
      fetchRecords(model.id, { resetPage: true })
    } catch (err: any) {
      setError('Unable to create record')
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (record: RecordRow) => {
    setEditingId(record.id)
    setEditingData(record.data)
  }

  const saveEdit = async () => {
    if (!model || !editingId) return
    setLoading(true)
    setError('')
    try {
      await api.put(`/records/${editingId}`, { data: editingData })
      setEditingId(null)
      setEditingData({})
      fetchRecords(model.id)
    } catch (err) {
      setError('Unable to update record')
    } finally {
      setLoading(false)
    }
  }

  const filterField = model?.fields.find((f) => f.slug === filterKey)

  return (
    <div className="space-y-6">
      <div className="glass p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase text-slate-400">Record browser</p>
          <h1 className="text-3xl font-semibold">{model?.name || 'Model records'}</h1>
          <p className="text-slate-300">Search, filter, and create data directly from your auto-generated model.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={workspaceId}
            onChange={(e) => updateWorkspace(Number(e.target.value))}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 w-28"
            placeholder="Workspace ID"
          />
          <button
            onClick={() => model && fetchRecords(model.id, { resetPage: true })}
            className="bg-brand-500 px-4 py-2 rounded-lg text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="glass p-5 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-slate-400">{model?.fields.length || 0} fields</p>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Link href={`/models/list?ws=${workspaceId}`} className="underline hover:text-white">Back to models</Link>
              {model?.slug && <span className="bg-slate-900 border border-slate-800 rounded-full px-2 py-1">{model.slug}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records"
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 w-full md:w-56"
            />
            <select
              value={sortBy || ''}
              onChange={(e) => setSortBy(e.target.value || null)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
            >
              <option value="created_at">Sort by created</option>
              <option value="updated_at">Sort by updated</option>
              {model?.fields.map((field) => (
                <option key={field.id} value={field.slug}>
                  Sort by {field.name}
                </option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <select
              value={filterKey}
              onChange={(e) => setFilterKey(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
            >
              <option value="">Filter field</option>
              {model?.fields.map((field) => (
                <option key={field.id} value={field.slug}>
                  {field.name}
                </option>
              ))}
            </select>
            {filterKey && (
              <div className="w-48">
                <FieldInput field={filterField!} value={filterValue} onChange={setFilterValue} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Page size</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewRecord((prev) => !prev)}
              className="bg-brand-500 px-4 py-2 rounded-lg text-white"
            >
              {showNewRecord ? 'Close form' : 'New Record'}
            </button>
          </div>
        </div>

        {showNewRecord && model && (
          <div className="border border-slate-800 rounded-xl p-4 space-y-3 bg-slate-950/60">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create record</h3>
              <button
                onClick={submitNewRecord}
                className="bg-brand-500 px-3 py-2 rounded-lg text-white"
              >
                Save
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {model.fields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <p className="text-sm text-slate-300">{field.name}</p>
                  <FieldInput
                    field={field}
                    value={newRecord[field.slug]}
                    onChange={(val) => setNewRecord((prev) => ({ ...prev, [field.slug]: val }))}
                  />
                  {field.is_required && <p className="text-xs text-orange-400">Required</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {loading && <p className="text-slate-400 text-sm">Loading...</p>}

        <div className="overflow-auto border border-slate-800 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/60 border-b border-slate-800">
              <tr>
                {model?.fields.map((field) => (
                  <th key={field.id} className="px-4 py-3 text-left text-slate-300">
                    {field.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-slate-300">Created</th>
                <th className="px-4 py-3 text-left text-slate-300">Updated</th>
                <th className="px-4 py-3 text-left text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayRecords.map((record) => (
                <tr key={record.id} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                  {model?.fields.map((field) => (
                    <td key={field.id} className="px-4 py-3 align-top">
                      {editingId === record.id ? (
                        <FieldInput
                          field={field}
                          value={editingData[field.slug]}
                          onChange={(val) => setEditingData((prev) => ({ ...prev, [field.slug]: val }))}
                        />
                      ) : (
                        <span className="text-slate-200">{fieldValue(record.data[field.slug], field)}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-slate-400">{new Date(record.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-400">{new Date(record.updated_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {editingId === record.id ? (
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="bg-brand-500 px-3 py-1 rounded text-white text-xs">Save</button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditingData({})
                          }}
                          className="border border-slate-700 px-3 py-1 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(record)}
                        className="border border-slate-700 px-3 py-1 rounded text-xs"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!displayRecords.length && (
                <tr>
                  <td colSpan={(model?.fields.length || 0) + 3} className="px-4 py-6 text-center text-slate-400">
                    No records yet. Create your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="border border-slate-800 px-3 py-2 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-300">Page {page + 1}</span>
            <button
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
              className="border border-slate-800 px-3 py-2 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="flex-1 h-2 bg-slate-900 border border-slate-800 rounded-full overflow-hidden min-w-[160px]">
              <div
                className="h-full bg-brand-500"
                style={{ width: `${Math.min(100, (usageEstimate / planLimit) * 100)}%` }}
              />
            </div>
            <span>
              {usageEstimate}/{planLimit} records used
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
