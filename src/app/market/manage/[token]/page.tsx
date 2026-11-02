import { Suspense } from 'react';
import FarmerDashboardClient from './FarmerDashboardClient';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ManageListingPage({ params }: PageProps) {
  const { token } = await params;

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 p-8">Loading dashboard...</div>}>
      <FarmerDashboardClient token={token} />
    </Suspense>
  );
}
