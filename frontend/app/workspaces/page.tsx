import Link from 'next/link'

const sampleWorkspaces = [
  { id: 1, name: 'Operations' },
  { id: 2, name: 'Customer Success' }
]

export default function WorkspacesPage() {
  return (
    <div className="glass p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-slate-400">Workspaces</p>
          <h1 className="text-3xl font-semibold">Choose where to build</h1>
        </div>
        <Link href="/models" className="bg-brand-500 px-4 py-2 rounded-lg text-white">New workspace</Link>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {sampleWorkspaces.map((ws) => (
          <Link key={ws.id} href={`/dashboard?workspace=${ws.id}`} className="border border-slate-800 rounded-xl p-4 hover:border-brand-500">
            <p className="text-lg font-semibold">{ws.name}</p>
            <p className="text-sm text-slate-400">Members: you + team</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
