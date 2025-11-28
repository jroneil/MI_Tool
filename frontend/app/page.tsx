import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

const bullets = [
  'Generate internal tools in minutes',
  'Auto CRUD screens for any data model',
  'Workspace ready auth, roles, and limits',
  'Built for founders, ops, and agencies'
]

const pricing = [
  {
    title: 'Free',
    price: '$0',
    description: '1 workspace, 1 app, 500 records',
    cta: 'Start for free'
  },
  {
    title: 'Pro',
    price: '$19',
    description: 'Unlimited apps and records',
    cta: 'Upgrade to Pro'
  }
]

export default function Home() {
  return (
    <div className="grid gap-10">
      <section className="glass p-10 grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-500">Faster than no-code</p>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">Generate internal tools in minutes. Simpler than low-code, more flexible than forms.</h1>
          <p className="text-slate-300 max-w-xl">AtlasBuilder turns your data model into a live CRUD dashboard with auth, validation, filtering, and notifications built-in.</p>
          <div className="flex gap-3">
            <Link href="/workspaces" className="bg-brand-500 hover:bg-brand-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2">
              Launch workspace
              <ArrowRight size={16} />
            </Link>
            <Link href="/models" className="px-4 py-2 border border-slate-700 rounded-lg">Build a model</Link>
          </div>
          <div className="grid gap-2">
            {bullets.map((copy) => (
              <p key={copy} className="flex items-center gap-2 text-slate-300">
                <Check size={16} className="text-brand-500" />
                {copy}
              </p>
            ))}
          </div>
        </div>
        <div className="glass p-6">
          <p className="text-xs uppercase text-slate-400 mb-4">Onboarding walkthrough</p>
          <ol className="space-y-4 text-slate-200 list-decimal list-inside">
            <li>Create an account with your team email.</li>
            <li>Spin up a workspace and invite collaborators.</li>
            <li>Define your entities and validation rules.</li>
            <li>Watch AtlasBuilder generate CRUD dashboards instantly.</li>
            <li>Ship to stakeholders with built-in auth and limits.</li>
          </ol>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="glass p-6 space-y-3">
          <h2 className="text-2xl font-semibold">Why this tool exists</h2>
          <p className="text-slate-300">Teams keep rebuilding the same admin consoles and approval flows. AtlasBuilder removes boilerplate so you can focus on the workflow, not scaffolding.</p>
        </div>
        <div className="glass p-6 space-y-3">
          <h2 className="text-2xl font-semibold">Use cases</h2>
          <ul className="list-disc list-inside text-slate-300 space-y-1">
            <li>Vendor issues tracker</li>
            <li>Lightweight CRM</li>
            <li>Content approvals</li>
            <li>Customer onboarding</li>
          </ul>
        </div>
      </section>

      <section className="glass p-8">
        <h2 className="text-3xl font-semibold mb-6">Pricing</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {pricing.map((plan) => (
            <div key={plan.title} className="p-6 border border-slate-800 rounded-xl">
              <p className="text-sm uppercase text-slate-400">{plan.title}</p>
              <p className="text-4xl font-semibold">{plan.price}</p>
              <p className="text-slate-300 mb-4">{plan.description}</p>
              <button className="bg-brand-500 px-4 py-2 rounded-lg text-white">{plan.cta}</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
