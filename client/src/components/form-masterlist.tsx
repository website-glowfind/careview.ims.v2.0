import { useEffect, useState } from 'react';
import { Search, Filter, FileText, Calendar, User, FileEdit, Eye, Trash2 } from 'lucide-react';
import type { FormType, FormStatus, Company, FormRecord } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import { FormViewer } from '@/components/form-viewer';
import { useFormRecordStore } from '@/store/formRecordStore';
import { useAuthStore } from '@/store/authStore';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { AssetCategoryBar } from '@/components/ui/AssetCategoryBar';
import { assetRegisterId, type RegisterId } from '@/utils/assetRegister';

export function FormMasterlist() {
  const { formRecords, selectedCompany, setSelectedCompany, fetchFormRecords, deleteFormRecord } = useFormRecordStore();
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const onCompanyChange = setSelectedCompany;

  const [deletingRecord, setDeletingRecord] = useState<FormRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load records from the backend on mount so they persist across refreshes
  useEffect(() => {
    fetchFormRecords();
  }, [fetchFormRecords]);

  const handleDelete = async () => {
    if (!deletingRecord?.id) return;
    setIsDeleting(true);
    try {
      await deleteFormRecord(deletingRecord.id);
      setDeletingRecord(null);
    } catch (err: any) {
      alert(`Failed to delete: ${err?.message ?? 'error'}`);
    } finally {
      setIsDeleting(false);
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [formTypeFilter, setFormTypeFilter] = useState<FormType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FormStatus | 'all'>('all');
  const [registerFilter, setRegisterFilter] = useState<RegisterId>('all');
  const [selectedRecord, setSelectedRecord] = useState<FormRecord | null>(null);
  const [viewingForm, setViewingForm] = useState<FormRecord | null>(null);

  // Filter form records by company
  const companyFilteredRecords = selectedCompany === 'all' 
    ? formRecords 
    : formRecords.filter(record => record.company === selectedCompany);

  // Apply search and additional filters
  const filteredRecords = companyFilteredRecords.filter(record => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      (record.assetTag?.toLowerCase() || '').includes(query) ||
      (record.referenceId?.toLowerCase() || '').includes(query) ||
      (record.employeeName?.toLowerCase() || '').includes(query) ||
      (record.department?.toLowerCase() || '').includes(query) ||
      (record.formType?.toLowerCase() || '').includes(query) ||
      (record.company?.toLowerCase() || '').includes(query)
    );

    const matchesFormType = formTypeFilter === 'all' || record.formType === formTypeFilter;
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesRegister = registerFilter === 'all' || assetRegisterId(record.formData as any) === registerFilter;

    return matchesSearch && matchesFormType && matchesStatus && matchesRegister;
  });

  const registerCounts = formRecords.reduce<Record<string, number>>((acc, r) => {
    const reg = assetRegisterId(r.formData as any);
    acc[reg] = (acc[reg] ?? 0) + 1;
    acc.all = (acc.all ?? 0) + 1;
    return acc;
  }, {});

  // Sort by date created (newest first)
  const sortedRecords = [...filteredRecords].sort((a, b) =>
    new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
  );

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(sortedRecords, 10);

  const getStatusBadgeClasses = (status: FormStatus) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Returned':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Disposed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Completed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getFormTypeColor = (formType: FormType) => {
    switch (formType) {
      case 'Asset Issuance':
        return 'text-blue-600';
      case 'Inventory Management':
        return 'text-purple-600';
      case 'Subscription Management':
        return 'text-indigo-600';
      case 'Asset Transfer':
        return 'text-orange-600';
      case 'Asset Disposal':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formTypes: (FormType | 'all')[] = [
    'all',
    'Asset Issuance',
    'Inventory Management',
    'Subscription Management',
    'Asset Transfer',
    'Asset Disposal'
  ];

  const statuses: (FormStatus | 'all')[] = [
    'all',
    'Active',
    'Returned',
    'Disposed',
    'Completed'
  ];

  return (
    <div>
      <AssetCategoryBar value={registerFilter} onChange={setRegisterFilter} counts={registerCounts} className="mb-6" />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Form Masterlist</h1>
        <p className="text-gray-600">Centralized record of all forms generated throughout the IT Asset lifecycle</p>
      </div>

      {/* Company Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => onCompanyChange('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            selectedCompany === 'all'
              ? 'bg-gray-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All Companies
        </button>
        <button
          onClick={() => onCompanyChange('KHEALTH')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors border ${
            selectedCompany === 'KHEALTH'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
          }`}
        >
          KHEALTH
        </button>
        <button
          onClick={() => onCompanyChange('CAREVIEW')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors border ${
            selectedCompany === 'CAREVIEW'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-green-600 border-green-600 hover:bg-green-50'
          }`}
        >
          CAREVIEW
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header with search and filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Form Records</h2>
              <p className="text-sm text-gray-600 mt-1">
                {sortedRecords.length} record{sortedRecords.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by asset tag, reference ID, employee, department, or form type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Form Type:</label>
                <div className="flex flex-wrap gap-2">
                  {formTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setFormTypeFilter(type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formTypeFilter === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {type === 'all' ? 'All Types' : type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status:</label>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {status === 'all' ? 'All Statuses' : status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {sortedRecords.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Form Records</h3>
              <p className="text-gray-600">
                {searchQuery || formTypeFilter !== 'all' || statusFilter !== 'all'
                  ? 'No form records match your filters'
                  : 'Form records will appear here as they are generated'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Form Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Asset Tag / Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Employee / Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pageItems.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 ${getFormTypeColor(record.formType!)}`} />
                        <span className={`text-sm font-semibold ${getFormTypeColor(record.formType!)}`}>
                          {record.formType}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {record.assetTag || record.referenceId || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{record.employeeName || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{record.department || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.company && (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(record.company)}`}>
                          {record.company}
                        </span>
                      )}
                      {!record.company && <span className="text-sm text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {new Date(record.dateCreated).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeClasses(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {record.formData && (
                          <button
                            onClick={() => setViewingForm(record)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View asset details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingRecord(record)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            label="records"
          />
        </div>
      </div>

      {/* View Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-gray bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${
                  selectedRecord.formType === 'Asset Issuance' ? 'bg-blue-100' :
                  selectedRecord.formType === 'Inventory Management' ? 'bg-purple-100' :
                  selectedRecord.formType === 'Subscription Management' ? 'bg-indigo-100' :
                  'bg-red-100'
                }`}>
                  <FileText className={`w-6 h-6 ${getFormTypeColor(selectedRecord.formType!)}`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedRecord.formType}</h3>
                  <p className="text-sm text-gray-600">Form Record Details</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Form Type:</label>
                  <p className={`text-sm font-semibold ${getFormTypeColor(selectedRecord.formType!)}`}>
                    {selectedRecord.formType}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status:</label>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeClasses(selectedRecord.status)}`}>
                    {selectedRecord.status}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Asset Tag:</label>
                  <p className="font-mono text-sm font-semibold text-gray-900">
                    {selectedRecord.assetTag || '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reference ID:</label>
                  <p className="font-mono text-sm font-semibold text-gray-900">
                    {selectedRecord.referenceId || '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Employee:</label>
                  <p className="text-sm text-gray-900">{selectedRecord.employeeName || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Department:</label>
                  <p className="text-sm text-gray-900">{selectedRecord.department || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Company:</label>
                  {selectedRecord.company ? (
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(selectedRecord.company)}`}>
                      {selectedRecord.company}
                    </span>
                  ) : (
                    <p className="text-sm text-gray-400">-</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date Created:</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedRecord.dateCreated).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Created By:</label>
                  <p className="text-sm text-gray-900">{selectedRecord.createdBy}</p>
                </div>
              </div>

              {selectedRecord.details && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Details:</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    {selectedRecord.details}
                  </p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Form records are view-only and cannot be edited. Only administrators can delete records (e.g. to remove duplicates).
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              {selectedRecord.formData && (
                <button
                  onClick={() => {
                    setViewingForm(selectedRecord);
                    setSelectedRecord(null);
                  }}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                >
                  <FileEdit className="w-4 h-4" />
                  View Full Form
                </button>
              )}
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Viewer */}
      {viewingForm && (
        <FormViewer
          formRecord={viewingForm}
          onClose={() => setViewingForm(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deletingRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Form Record</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Delete this <strong>{deletingRecord.formType}</strong> record
              {deletingRecord.assetTag ? <> for <span className="font-mono font-semibold">{deletingRecord.assetTag}</span></> : null}
              {deletingRecord.employeeName ? <> ({deletingRecord.employeeName})</> : null}? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingRecord(null)}
                disabled={isDeleting}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}