'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { storeWorkspaceId } from '@/lib/workspace-store'

interface Membership {
  workspace: {
    id: number
    name: string
  }
  role: string
}

interface WorkspaceRead {
  id: number
  name: string
}

export default function WorkspacesPage() {
  const router = useRouter()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showNewWorkspace, setShowNewWorkspace] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const fetchMemberships = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<Membership[]>('/workspaces/me')
      setMemberships(res.data)
    } catch (err) {
      setError('Unable to load workspaces')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMemberships()
  }, [])

  const handleSelectWorkspace = (workspaceId: number) => {
    storeWorkspaceId(workspaceId)
    router.push(`/models/list?ws=${workspaceId}`)
  }

  const submitNewWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceName.trim()) return
    setCreateError('')
    setCreating(true)
    try {
      const res = await api.post<WorkspaceRead>('/workspaces', { name: workspaceName.trim() })
      setWorkspaceName('')
      setShowNewWorkspace(false)
      await fetchMemberships()
      storeWorkspaceId(res.data.id)
      router.push(`/models/list?ws=${res.data.id}`)
    } catch (err) {
      setCreateError('Unable to create workspace')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="glass p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-slate-400">Workspaces</p>
          <h1 className="text-3xl font-semibold">Choose where to build</h1>
        </div>
        <button
          onClick={() => setShowNewWorkspace(true)}
          className="bg-brand-500 px-4 py-2 rounded-lg text-white"
        >
          New workspace
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && <p className="text-slate-400 text-sm">Loading workspaces...</p>}

      <div className="grid md:grid-cols-2 gap-4">
        {memberships.map((membership) => (
          <button
            key={membership.workspace.id}
            onClick={() => handleSelectWorkspace(membership.workspace.id)}
            className="border border-slate-800 rounded-xl p-4 hover:border-brand-500 text-left"
          >
            <p className="text-lg font-semibold">{membership.workspace.name}</p>
            <p className="text-sm text-slate-400">Role: {membership.role}</p>
          </button>
        ))}
      </div>

      {!loading && !memberships.length && !error && (
        <div className="border border-dashed border-slate-800 rounded-xl p-6 text-center text-slate-400">
          No workspaces yet. Create one to get started.
        </div>
      )}

      {showNewWorkspace && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase text-slate-400">New workspace</p>
                <h2 className="text-2xl font-semibold">Create workspace</h2>
              </div>
              <button onClick={() => setShowNewWorkspace(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={submitNewWorkspace} className="space-y-3">
              <div>
                <label className="text-sm text-slate-300">Workspace name</label>
                <input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Marketing, Ops, or Product"
                  className="mt-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 w-full"
                />
              </div>

              {createError && <p className="text-sm text-red-400">{createError}</p>}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewWorkspace(false)}
                  className="border border-slate-800 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-brand-500 px-4 py-2 rounded-lg text-white disabled:opacity-60"
                >
                  {creating ? 'Creating...' : 'Create workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
