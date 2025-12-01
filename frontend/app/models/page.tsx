'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { getWorkspaceId, storeWorkspaceId } from '@/lib/workspace-store'

const fieldTypes = ['string', 'text', 'number', 'boolean', 'date', 'datetime', 'enum', 'relation']

type FieldRow = {
  name: string
  slug: string
  data_type: string
  is_required: boolean
  is_unique: boolean
  options?: string
}

export default function ModelsPage() {
  const [name, setName] = useState('Tickets')
  const [slug, setSlug] = useState('tickets')
  const [workspaceId, setWorkspaceId] = useState(() => getWorkspaceId() || 1)
  const [fields, setFields] = useState<FieldRow[]>([
    { name: 'Title', slug: 'title', data_type: 'string', is_required: true, is_unique: false }
  ])
  const [message, setMessage] = useState('')

  const addField = () =>
    setFields([
      ...fields,
      { name: '', slug: '', data_type: 'string', is_required: false, is_unique: false, options: '' }
    ])

  const submit = async () => {
    setMessage('')
    try {
      const normalizedFields = fields.map((field, index) => ({
        name: field.name,
        slug: field.slug,
        data_type: field.data_type,
        is_required: field.is_required,
        is_unique: field.is_unique,
        position: index,
        config:
          field.data_type === 'enum' && field.options
            ? { options: field.options.split(',').map((opt) => opt.trim()).filter(Boolean) }
            : undefined
      }))

      const res = await api.post('/models', {
        workspace_id: workspaceId,
        name,
        slug,
        fields: normalizedFields
      })
      setMessage('Model created: ' + res.data.name)
      storeWorkspaceId(workspaceId)
    } catch (err) {
      setMessage('Failed to create model')
    }
  }

  return (
    <div className="glass p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-slate-400">Model builder</p>
          <h1 className="text-3xl font-semibold">Define your entity</h1>
        </div>
        <button onClick={submit} className="bg-brand-500 px-4 py-2 rounded-lg text-white">Generate CRUD</button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <label className="grid gap-1">
          <span>Name</span>
          <input className="bg-slate-900 p-2 rounded" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span>Slug</span>
          <input className="bg-slate-900 p-2 rounded" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span>Workspace id</span>
          <input
            className="bg-slate-900 p-2 rounded"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="space-y-3">
        <p className="text-sm text-slate-400">Fields</p>
        {fields.map((field, idx) => (
          <div key={idx} className="grid md:grid-cols-5 gap-2 items-center">
            <input
              placeholder="Name"
              className="bg-slate-900 p-2 rounded"
              value={field.name}
              onChange={(e) =>
                setFields(fields.map((f, i) => (i === idx ? { ...f, name: e.target.value } : f)))
              }
            />
            <input
              placeholder="Slug"
              className="bg-slate-900 p-2 rounded"
              value={field.slug}
              onChange={(e) =>
                setFields(fields.map((f, i) => (i === idx ? { ...f, slug: e.target.value } : f)))
              }
            />
            <select
              className="bg-slate-900 p-2 rounded"
              value={field.data_type}
              onChange={(e) =>
                setFields(fields.map((f, i) => (i === idx ? { ...f, data_type: e.target.value } : f)))
              }
            >
              {fieldTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <label className="flex gap-2 items-center text-sm text-slate-300">
              <input
                type="checkbox"
                checked={field.is_required}
                onChange={(e) =>
                  setFields(fields.map((f, i) => (i === idx ? { ...f, is_required: e.target.checked } : f)))
                }
              />
              Required
            </label>
            <label className="flex gap-2 items-center text-sm text-slate-300">
              <input
                type="checkbox"
                checked={field.is_unique}
                onChange={(e) =>
                  setFields(fields.map((f, i) => (i === idx ? { ...f, is_unique: e.target.checked } : f)))
                }
              />
              Unique
            </label>
            {field.data_type === 'enum' && (
              <input
                placeholder="Options (comma separated)"
                className="bg-slate-900 p-2 rounded col-span-2 md:col-span-5"
                value={field.options || ''}
                onChange={(e) =>
                  setFields(fields.map((f, i) => (i === idx ? { ...f, options: e.target.value } : f)))
                }
              />
            )}
          </div>
        ))}
        <button onClick={addField} className="border border-slate-800 px-3 py-2 rounded">Add field</button>
      </div>
      {message && <p className="text-sm text-slate-300">{message}</p>}
    </div>
  )
}
