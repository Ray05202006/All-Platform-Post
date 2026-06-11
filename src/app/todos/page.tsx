import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <ul className="list-disc pl-5 space-y-1">
      {todos?.map((todo) => (
        <li key={todo.id} className="text-sm text-zinc-700 dark:text-zinc-300">
          {todo.name}
        </li>
      ))}
    </ul>
  )
}
