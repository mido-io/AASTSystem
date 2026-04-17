import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import UsersManagement from './UsersManagement';

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="flex-1 p-8 bg-gray-50 dark:bg-slate-900/50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-6">User Management</h1>
        <UsersManagement />
      </div>
    </div>
  );
}
