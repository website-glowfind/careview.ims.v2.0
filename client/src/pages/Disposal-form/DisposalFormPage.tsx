import { useEffect, useState } from 'react';
import { DisposalForm } from '@/components/disposal-form';
import { useAssetStore } from '@/store/assetStore';
import { useAuthStore } from '@/store/authStore';
import { useFormRecordStore } from '@/store/formRecordStore';
import { useDisposalDraftStore } from '@/store/disposalDraftStore';
import type { ITAsset } from '@/types/inventory';

export function DisposalFormPage() {
  const { assets } = useAssetStore();
  const { user } = useAuthStore();
  const { addFormRecord } = useFormRecordStore();
  const draft = useDisposalDraftStore((s) => s.items);
  const clearDraft = useDisposalDraftStore((s) => s.clear);

  // Consume the draft once on mount so it doesn't re-apply on later visits.
  const [preselected] = useState<ITAsset[]>(draft);
  useEffect(() => { if (draft.length) clearDraft(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DisposalForm
      assets={assets}
      currentUser={user?.name || 'Admin'}
      onSaveFormRecord={addFormRecord}
      preselectedAssets={preselected}
    />
  );
}
