'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { getWorkspaceId, storeWorkspaceId, subscribe } from '@/lib/workspace-store'

interface ModelField {
  id: number
  name: string
  key: string
  field_type: string
}

interface ModelItem {
  id: number
  name: string
  slug: string
  description?: string | null
  fields: ModelField[]
  created_at?: string
}

export default function ModelsListPage() {
  const searchParams = useSearchParams()
  const [organizationId, setOrganizationId] = useState<number>(() => getWorkspaceId() || 1)
  const [models, setModels] = useState<ModelItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const updateWorkspace = (value: number) => {
    const normalized = Number.isFinite(value) && value > 0 ? value : 1
    setOrganizationId(normalized)
    storeWorkspaceId(normalized)
  }

  const filteredModels = useMemo(() => {
    if (!filter.trim()) return models
    return models.filter((model) =>
      model.name.toLowerCase().includes(filter.toLowerCase()) ||
      model.slug.toLowerCase().includes(filter.toLowerCase())
    )
  }, [filter, models])

  const fetchModels = async () => {
    if (!organizationId || organizationId <= 0) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get<ModelItem[]>('/models', {
        params: { organization_id: organizationId }
      })
      setModels(res.data)
    } catch (err) {
      setError('Unable to load models for this workspace')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fromQuery = Number(searchParams.get('org'))
    if (Number.isFinite(fromQuery) && fromQuery > 0 && fromQuery !== organizationId) {
      updateWorkspace(fromQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    const unsubscribe = subscribe((id) => {
      if (id && id !== organizationId) {
        setOrganizationId(id)
      }
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  useEffect(() => {
    if (organizationId > 0) {
      storeWorkspaceId(organizationId)
    }
  }, [organizationId])

  useEffect(() => {
    fetchModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  return (
    <div className="space-y-6">
      <div className="glass p-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-slate-400">Model library</p>
          <h1 className="text-3xl font-semibold">Available entities</h1>
          <p className="text-slate-300">Browse schemas defined for the current workspace.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={organizationId}
            onChange={(e) => updateWorkspace(Number(e.target.value))}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 w-28"
            placeholder="Org ID"
          />
          <button
            onClick={fetchModels}
            className="bg-brand-500 px-4 py-2 rounded-lg text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="glass p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">{filteredModels.length} models</p>
            <h2 className="text-xl font-semibold">Schemas</h2>
          </div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name or slug"
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 w-full md:w-64"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {loading ? (
          <p className="text-slate-400 text-sm">Loading models...</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {filteredModels.map((model) => (
              <Link
                key={model.id}
                href={`/models/${model.slug}/records?org=${organizationId}`}
                className="border border-slate-800 hover:border-brand-500/60 rounded-xl p-4 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase text-slate-400">{model.slug}</p>
                    <h3 className="text-lg font-semibold">{model.name}</h3>
                  </div>
                  <span className="text-sm bg-slate-900 border border-slate-800 rounded-full px-3 py-1">
                    {model.fields.length} fields
                  </span>
                </div>
                <div className="mt-3 text-sm text-slate-400 flex items-center gap-4">
                  <span>Created {model.created_at ? new Date(model.created_at).toLocaleDateString() : 'Recently'}</span>
                  {model.description && <span className="truncate">{model.description}</span>}
                </div>
              </Link>
            ))}

            {!filteredModels.length && !error && (
              <div className="border border-dashed border-slate-800 rounded-xl p-6 text-center text-slate-400">
                No models found for this workspace.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
