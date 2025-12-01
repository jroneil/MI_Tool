'use client'
import { useEffect, useMemo, useState } from 'react'
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
  const [successMessage, setSuccessMessage] = useState('')
  const [serverError, setServerError] = useState('')

  const normalizeSlug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
      .replace(/[-_]{2,}/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '')

  const validate = () => {
    const errors: {
      name: string
      slug: string
      workspaceId: string
      fields: { name: string; slug: string }[]
    } = { name: '', slug: '', workspaceId: '', fields: fields.map(() => ({ name: '', slug: '' })) }

    if (!name.trim()) errors.name = 'Name is required'
    if (!slug.trim()) errors.slug = 'Slug is required'
    if (!workspaceId) errors.workspaceId = 'Workspace id is required'

    const nameCounts: Record<string, number> = {}
    const slugCounts: Record<string, number> = {}

    fields.forEach((field) => {
      const normalizedName = field.name.trim().toLowerCase()
      const normalizedSlug = field.slug.trim().toLowerCase()
      if (normalizedName) nameCounts[normalizedName] = (nameCounts[normalizedName] || 0) + 1
      if (normalizedSlug) slugCounts[normalizedSlug] = (slugCounts[normalizedSlug] || 0) + 1
    })

    fields.forEach((field, index) => {
      const fieldName = field.name.trim()
      const fieldSlug = field.slug.trim()

      if (!fieldName) errors.fields[index].name = 'Field name is required'
      if (!fieldSlug) errors.fields[index].slug = 'Field slug is required'

      if (fieldName && nameCounts[fieldName.toLowerCase()] > 1)
        errors.fields[index].name = 'Duplicate field name'

      if (fieldSlug && slugCounts[fieldSlug.toLowerCase()] > 1)
        errors.fields[index].slug = 'Duplicate field slug'
    })

    return errors
  }

  const validationErrors = useMemo(validate, [name, slug, workspaceId, fields])

  const isFormValid = useMemo(
    () =>
      !validationErrors.name &&
      !validationErrors.slug &&
      !validationErrors.workspaceId &&
      validationErrors.fields.every((field) => !field.name && !field.slug),
    [validationErrors]
  )

  useEffect(() => {
    if (successMessage) setSuccessMessage('')
    if (serverError) setServerError('')
  }, [name, slug, workspaceId, fields])

  const addField = () =>
    setFields([
      ...fields,
      { name: '', slug: '', data_type: 'string', is_required: false, is_unique: false, options: '' }
    ])

  const submit = async () => {
    const errors = validate()
    if (
      errors.name ||
      errors.slug ||
      errors.workspaceId ||
      errors.fields.some((field) => field.name || field.slug)
    ) {
      return
    }

    setSuccessMessage('')
    setServerError('')
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
      setSuccessMessage('Model created: ' + res.data.name)
      storeWorkspaceId(workspaceId)
    } catch (err) {
      setServerError('Failed to create model')
    }
  }

  return (
    <div className="glass p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-slate-400">Model builder</p>
          <h1 className="text-3xl font-semibold">Define your entity</h1>
        </div>
        <button
          onClick={submit}
          disabled={!isFormValid}
          className={`px-4 py-2 rounded-lg text-white ${
            isFormValid ? 'bg-brand-500' : 'bg-slate-700 cursor-not-allowed'
          }`}
        >
          Generate CRUD
        </button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <label className="grid gap-1">
          <span>Name</span>
          <input
            className="bg-slate-900 p-2 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {validationErrors.name && <p className="text-xs text-red-400">{validationErrors.name}</p>}
        </label>
        <label className="grid gap-1">
          <span>Slug</span>
          <input
            className="bg-slate-900 p-2 rounded"
            value={slug}
            onChange={(e) => setSlug(normalizeSlug(e.target.value))}
          />
          {validationErrors.slug && <p className="text-xs text-red-400">{validationErrors.slug}</p>}
        </label>
        <label className="grid gap-1">
          <span>Workspace id</span>
          <input
            className="bg-slate-900 p-2 rounded"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(Number(e.target.value))}
          />
          {validationErrors.workspaceId && (
            <p className="text-xs text-red-400">{validationErrors.workspaceId}</p>
          )}
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
                setFields(fields.map((f, i) => (i === idx ? { ...f, slug: normalizeSlug(e.target.value) } : f)))
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
            <div className="col-span-2 md:col-span-5 grid grid-cols-2 gap-2 text-xs text-red-400">
              <span>{validationErrors.fields[idx]?.name}</span>
              <span>{validationErrors.fields[idx]?.slug}</span>
            </div>
          </div>
        ))}
        <button onClick={addField} className="border border-slate-800 px-3 py-2 rounded">Add field</button>
      </div>
      {successMessage && <p className="text-sm text-green-400">{successMessage}</p>}
      {serverError && <p className="text-sm text-red-400">{serverError}</p>}
    </div>
  )
}
