'use client'
import { useState } from 'react'
import { api } from '@/lib/api'

const fieldTypes = ['string', 'number', 'boolean', 'date', 'enum', 'longtext', 'relation']

type FieldRow = {
  name: string
  key: string
  field_type: string
  required: boolean
}

export default function ModelsPage() {
  const [name, setName] = useState('Tickets')
  const [slug, setSlug] = useState('tickets')
  const [orgId, setOrgId] = useState(1)
  const [fields, setFields] = useState<FieldRow[]>([
    { name: 'Title', key: 'title', field_type: 'string', required: true }
  ])
  const [message, setMessage] = useState('')

  const addField = () => setFields([...fields, { name: '', key: '', field_type: 'string', required: false }])

  const submit = async () => {
    setMessage('')
    try {
      const res = await api.post('/models', {
        organization_id: orgId,
        name,
        slug,
        fields
      })
      setMessage('Model created: ' + res.data.name)
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
          <input className="bg-slate-900 p-2 rounded" value={orgId} onChange={(e) => setOrgId(Number(e.target.value))} />
        </label>
      </div>
      <div className="space-y-3">
        <p className="text-sm text-slate-400">Fields</p>
        {fields.map((field, idx) => (
          <div key={idx} className="grid md:grid-cols-4 gap-2 items-center">
            <input placeholder="Name" className="bg-slate-900 p-2 rounded" value={field.name} onChange={(e) => setFields(fields.map((f,i) => i===idx ? {...f, name: e.target.value} : f))} />
            <input placeholder="Key" className="bg-slate-900 p-2 rounded" value={field.key} onChange={(e) => setFields(fields.map((f,i) => i===idx ? {...f, key: e.target.value} : f))} />
            <select className="bg-slate-900 p-2 rounded" value={field.field_type} onChange={(e) => setFields(fields.map((f,i) => i===idx ? {...f, field_type: e.target.value} : f))}>
              {fieldTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <label className="flex gap-2 items-center text-sm text-slate-300">
              <input type="checkbox" checked={field.required} onChange={(e) => setFields(fields.map((f,i) => i===idx ? {...f, required: e.target.checked} : f))} />
              Required
            </label>
          </div>
        ))}
        <button onClick={addField} className="border border-slate-800 px-3 py-2 rounded">Add field</button>
      </div>
      {message && <p className="text-sm text-slate-300">{message}</p>}
    </div>
  )
}
