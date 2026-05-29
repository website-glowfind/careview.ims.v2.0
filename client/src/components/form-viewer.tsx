import { X, Eye, FileText } from 'lucide-react';
import type { FormRecord } from '@/types/inventory';
import { IssuanceAgreement } from '@/components/issuance-agreement';
import { DisposalFormViewer } from '@/components/disposal-form-viewer';
import { AssetRecordForm } from '@/components/asset-record-form';
import { TransferFormViewer } from '@/components/transfer-form-viewer';

interface FormViewerProps {
  formRecord: FormRecord;
  onClose: () => void;
}

export function FormViewer({ formRecord, onClose }: FormViewerProps) {
  // Render appropriate form based on formType
  const renderForm = () => {
    switch (formRecord.formType) {
      case 'Asset Issuance':
        return (
          <IssuanceAgreement
            assetData={formRecord.formData}
            onClose={onClose}
            isReadOnly={true}
          />
        );
      
      case 'Asset Disposal':
        return (
          <DisposalFormViewer
            formData={formRecord.formData}
            onClose={onClose}
            isReadOnly={true}
          />
        );
      
      case 'Inventory Management':
        return (
          <AssetRecordForm
            formRecord={formRecord}
            categories={[]}
            onAddCategory={() => {}}
            onDeleteCategory={() => {}}
            defaultCategories={[]}
            onSave={() => {}}
            onCancel={onClose}
            currentUser=""
          />
        );
      
      case 'Subscription Management':
        // Use AssetRecordForm with subscription data for proper view mode
        return (
          <AssetRecordForm
            formRecord={formRecord}
            categories={[]}
            onAddCategory={() => {}}
            onDeleteCategory={() => {}}
            defaultCategories={[]}
            onSave={() => {}}
            onCancel={onClose}
            currentUser=""
          />
        );

      case 'Asset Transfer':
        return (
          <TransferFormViewer
            formData={formRecord.formData}
            onClose={onClose}
            isReadOnly={true}
          />
        );

      default:
        return null;
    }
  };

  return renderForm();
}