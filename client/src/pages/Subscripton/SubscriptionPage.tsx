import { useEffect, useState } from 'react';
import { SubscriptionList } from '@/components/subscription-list-new';
import { SubscriptionDetails } from '@/components/subscription-detail';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useAssetStore } from '@/store/assetStore';
import { useAuthStore } from '@/store/authStore';
import { useFormRecordStore } from '@/store/formRecordStore';
import type { Subscription } from '@/types/subscription';

export function SubscriptionPage() {
  const {
    subscriptions,
    selectedCompany,
    isLoading,
    fetchSubscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    setSelectedCompany,
  } = useSubscriptionStore();

  const { assets, fetchAssets } = useAssetStore();
  const { user } = useAuthStore();
  const { addFormRecord } = useFormRecordStore();

  const [viewingSubscription, setViewingSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    fetchSubscriptions();
    fetchAssets();
  }, [fetchSubscriptions, fetchAssets]);

  const handleAdd = async (data: Omit<Subscription, 'id'>) => {
    try {
      await addSubscription(data);
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    }
  };

  const handleEdit = async (id: string, data: Omit<Subscription, 'id'>) => {
    try {
      await updateSubscription(id, data);
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSubscription(id);
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    }
  };

  if (isLoading && subscriptions.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          License & Subscription Management
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mt-1">
          Track and manage software licenses and subscriptions
        </p>
      </div>

      <SubscriptionList
        company={selectedCompany}
        onCompanyChange={setSelectedCompany}
        subscriptions={subscriptions}
        onAddSubscription={handleAdd}
        onEditSubscription={handleEdit}
        onDeleteSubscription={handleDelete}
        onViewSubscription={setViewingSubscription}
        assets={assets}
        assetCategories={['laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'printer', 'server', 'networking', 'phone', 'tablet', 'other']}
        onAddCategory={() => {}}
        onDeleteCategory={() => {}}
        defaultCategories={['laptop', 'desktop', 'monitor', 'phone']}
        onSaveFormRecord={addFormRecord}
        currentUser={user?.name || 'Admin'}
      />

      {viewingSubscription && (
        <SubscriptionDetails
          subscription={viewingSubscription}
          onClose={() => setViewingSubscription(null)}
          assets={assets}
          onSaveFormRecord={addFormRecord}
          currentUser={user?.name || 'Admin'}
        />
      )}
    </div>
  );
}
