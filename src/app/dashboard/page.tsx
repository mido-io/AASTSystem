import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminView from '@/components/AdminView';
import UserView from '@/components/UserView';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, can_view_availability, full_name, is_approved')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return (
      <div className="flex-1 p-8 bg-gray-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800/30">
            <h2 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-2">Profile Not Found</h2>
            <p className="text-orange-700 dark:text-orange-300">
              Your user profile could not be found. Please contact the system administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile.is_approved) {
    redirect('/login?pending=true');
  }

  if (profile.role === 'BRANCH_MANAGER') {
    redirect('/dashboard/branch-manager');
  }

  const role = profile.role;
  let canViewAvailability = profile.can_view_availability ?? false;

  if (!canViewAvailability && (role === 'EMPLOYEE' || role === 'SECRETARY')) {
    const cairoDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
    const todayStr = `${cairoDate.getFullYear()}-${String(cairoDate.getMonth() + 1).padStart(2, '0')}-${String(cairoDate.getDate()).padStart(2, '0')}`;

    const { data: delegations } = await supabase
      .from('delegations')
      .select('id')
      .eq('substitute_user_id', user.id)
      .eq('is_active', true)
      .lte('start_date', todayStr)
      .gte('end_date', todayStr)
      .limit(1);

    if (delegations && delegations.length > 0) {
      canViewAvailability = true;
    }
  }

  return (
    <div className="flex-1 p-8 bg-gray-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        {role === 'ADMIN' ? (
          <AdminView />
        ) : role === 'EMPLOYEE' || role === 'SECRETARY' ? (
          <UserView role={role} userId={user.id} canViewAvailability={canViewAvailability} />
        ) : (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800/30">
            <h2 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-2">Role Not Configured</h2>
            <p className="text-orange-700 dark:text-orange-300">
              Your role ({role ?? 'Unknown'}) does not have a configured view. Contact your administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
