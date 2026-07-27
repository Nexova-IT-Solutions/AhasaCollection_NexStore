import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch from 'todos' as requested by the user
  const { data: todos, error } = await supabase.from('todos').select()

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Database Connection Error</h1>
        <p className="mt-2 text-gray-600">Error: {error.message}</p>
        <p className="mt-1 text-sm text-gray-500 font-mono">Code: {error.code}</p>
        <div className="mt-8">
          <p className="font-semibold">Debug Checklist:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Ensure you have run <code className="bg-gray-100 px-1">npx prisma db push</code> locally</li>
            <li>Verify <code className="bg-gray-100 px-1">DATABASE_URL</code> and <code className="bg-gray-100 px-1">DIRECT_URL</code> are set on Vercel</li>
            <li>Check if the <code className="bg-gray-100 px-1">todos</code> table exists on Supabase</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
      
      {todos && todos.length > 0 ? (
        <ul className="space-y-3">
          {todos.map((todo) => (
            <li key={todo.id} className="p-4 bg-white border rounded-xl shadow-sm flex items-center justify-between">
              <span className="font-medium">{todo.name || todo.title}</span>
              {todo.is_completed && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Completed</span>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-8 border-2 border-dashed rounded-2xl text-center text-gray-500">
          No todos found. If you just created the database, add a row in the Supabase Table Editor!
        </div>
      )}
    </div>
  )
}
