import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SuperAdminSidebar } from '@/components/super-admin/Sidebar'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('id, full_name, email, role')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!superAdmin) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f1f5f9' }}>
      <SuperAdminSidebar admin={superAdmin} />
      <main className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
        {children}
      </main>
    </div>
  )
}
