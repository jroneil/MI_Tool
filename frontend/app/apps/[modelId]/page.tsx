interface Props {
  params: { modelId: string }
}

const mockRecords = [
  { id: 1, data: { title: 'First ticket', status: 'open' } },
  { id: 2, data: { title: 'Second ticket', status: 'closed' } }
]

export default function ModelAppPage({ params }: Props) {
  const { modelId } = params

  return (
    <div className="glass p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-slate-400">Live app</p>
          <h1 className="text-3xl font-semibold">Model #{modelId}</h1>
        </div>
        <button className="bg-brand-500 px-4 py-2 rounded-lg text-white">Create record</button>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-2">ID</th>
              <th className="py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {mockRecords.map((record) => (
              <tr key={record.id} className="border-b border-slate-800">
                <td className="py-2">{record.id}</td>
                <td className="py-2 text-slate-300">{JSON.stringify(record.data)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
