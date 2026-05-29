import { DisposalForm } from '@/components/disposal-form';
import { useAssetStore } from '@/store/assetStore';
import { useAuthStore } from '@/store/authStore';
import { useFormRecordStore } from '@/store/formRecordStore';

export function DisposalFormPage() {
  const { assets } = useAssetStore();
  const { user } = useAuthStore();
  const { addFormRecord } = useFormRecordStore();

  return (
    <DisposalForm
      assets={assets}
      currentUser={user?.name || 'Admin'}
      onSaveFormRecord={addFormRecord}
    />
  );
}
