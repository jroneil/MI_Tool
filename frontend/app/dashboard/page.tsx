const cards = [
  {
    title: 'Apps',
    description: 'Auto-generated CRUD experiences for each model',
    count: 3
  },
  {
    title: 'Records used',
    description: 'Usage against plan limits',
    count: 240
  },
  {
    title: 'Invites',
    description: 'Manage workspace members and roles',
    count: 5
  }
]

export default function DashboardPage() {
  return (
    <div className="grid gap-4">
      <div className="glass p-6">
        <p className="text-sm uppercase text-slate-400">Workspace overview</p>
        <h1 className="text-3xl font-semibold">Control panel</h1>
        <p className="text-slate-300">Manage models, enforce limits, and watch CRUD pages update instantly.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.title} className="glass p-4">
            <p className="text-sm text-slate-400">{card.title}</p>
            <p className="text-3xl font-semibold">{card.count}</p>
            <p className="text-slate-400 text-sm">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
