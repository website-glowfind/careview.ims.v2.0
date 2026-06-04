import { SubscriptionList } from '@/components/subscription-list-new';
import type { Company, FormRecord, ITAsset } from '@/types/inventory';
import type { Subscription } from '@/types/subscription';

interface SubscriptionsPageProps {
  company: Company | 'ALL';
  onCompanyChange: (company: Company | 'ALL') => void;
  subscriptions: Subscription[];
  onAddSubscription: (subscription: Omit<Subscription, 'id'>) => void;
  onEditSubscription: (id: string, subscription: Omit<Subscription, 'id'>) => void;
  onDeleteSubscription: (id: string) => void;
  onViewSubscription: (subscription: Subscription) => void;
  assets: ITAsset[];
  assetCategories: string[];
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  defaultCategories: string[];
  onSaveFormRecord: (record: Omit<FormRecord, 'id' | 'dateCreated'>) => void;
  currentUser: string;
}

export function SubscriptionsPage({
  company,
  onCompanyChange,
  subscriptions,
  onAddSubscription,
  onEditSubscription,
  onDeleteSubscription,
  onViewSubscription,
  assets,
  assetCategories,
  onAddCategory,
  onDeleteCategory,
  defaultCategories,
  onSaveFormRecord,
  currentUser,
}: SubscriptionsPageProps) {
  return (
    <SubscriptionList
      company={company}
      onCompanyChange={onCompanyChange}
      subscriptions={subscriptions}
      onAddSubscription={onAddSubscription}
      onEditSubscription={onEditSubscription}
      onDeleteSubscription={onDeleteSubscription}
      onViewSubscription={onViewSubscription}
      assets={assets}
      assetCategories={assetCategories}
      onAddCategory={onAddCategory}
      onDeleteCategory={onDeleteCategory}
      defaultCategories={defaultCategories}
      onSaveFormRecord={onSaveFormRecord}
      currentUser={currentUser}
    />
  );
}
