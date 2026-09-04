import { redirect } from 'next/navigation';

/**
 * The old Discover feed was retired in favor of the Discover (browse)
 * page at /projects, which now carries the admin-pinned projects at
 * the top. Keep the route as a redirect so old bookmarks and
 * notification links keep working.
 */
export default function DashboardPage() {
  redirect('/projects');
}
