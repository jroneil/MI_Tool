'use client'
import { FormEvent, useState } from 'react'
import { api } from '@/lib/api'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setMessage('')
    try {
      const res = await api.post('/auth/register', { email, password })
      setMessage('Registered ' + res.data.email)
    } catch (err) {
      setMessage('Registration failed')
    }
  }

  return (
    <div className="max-w-md mx-auto glass p-8">
      <h1 className="text-2xl font-semibold mb-4">Create account</h1>
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1">
          <span>Email</span>
          <input className="bg-slate-900 p-2 rounded" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span>Password</span>
          <input type="password" className="bg-slate-900 p-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="bg-brand-500 px-4 py-2 rounded text-white">Register</button>
        {message && <p className="text-sm text-slate-300">{message}</p>}
      </form>
    </div>
  )
}
