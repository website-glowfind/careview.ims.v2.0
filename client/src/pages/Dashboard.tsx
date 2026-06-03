import { DashboardCardView } from '@/components/dashboard-card-view';

export function Dashboard() {
  return <DashboardCardView />;
}

// ── OLD DASHBOARD (keep for easy rollback) ────────────────────────────────
// To restore: replace the export above with OldDashboard content below
//
// import { useEffect } from 'react';
// import { DashboardStats } from '@/components/dashboard-stats';
// import { useAssetStore } from '@/store/assetStore';
// ... (original Dashboard code)