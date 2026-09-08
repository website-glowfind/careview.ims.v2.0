import { useState, useRef } from 'react';
import { X, ArrowRightLeft, Printer } from 'lucide-react';
import type { ITAsset, Company, FormRecord } from '@/types/inventory';
import { getCompanyLogo, getCompanyHexColor } from '@/utils/device-code';
import { downloadPDF, printPDF } from '@/utils/pdf';
import { useAssetStore } from '@/store/assetStore';
import { employeeServices } from '@/services/employeeServices';
import type { Employee } from '@/store/employeeStore';

interface EmployeeNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectEmployee?: (emp: Employee) => void;
  placeholder?: string;
  className?: string;
}

function EmployeeNameInput({ value, onChange, onSelectEmployee, placeholder, className }: EmployeeNameInputProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suggestions, setSuggestions] = useState<Employee[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setShowSuggestions(false);
    setSuggestions([]);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val.trim() || val.trim().length < 2) return;
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await employeeServices.getEmployees({ search: val.trim(), limit: 8 });
        const list = data.employees ?? [];
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (emp: Employee) => {
    if (onSelectEmployee) {
      onSelectEmployee(emp);
    } else {
      onChange(emp.fullName);
    }
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      )}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map(emp => (
            <li
              key={emp._id ?? emp.employeeId}
              onMouseDown={() => handleSelect(emp)}
              className="px-3 py-2.5 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-0"
            >
              <p className="font-medium text-sm text-gray-900">{emp.fullName}</p>
              <p className="text-xs text-gray-500">
                {emp.employeeId}
                {emp.department ? ` · ${emp.department}` : ''}
                {emp.position ? ` · ${emp.position}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface TransferFormProps {
  asset: ITAsset;
  onTransfer: (assetId: string, toCompany: Company, fromName?: string, toName?: string) => void;
  onCancel: () => void;
  currentUser: string;
  onSaveFormRecord?: (record: Omit<FormRecord, 'id' | 'dateCreated'>) => void;
  onNewForm?: () => void;
}

export function TransferForm({ asset, onTransfer, onCancel, currentUser, onSaveFormRecord }: TransferFormProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { updateAsset } = useAssetStore();

  // Transfer fields
  const [toCompany, setToCompany] = useState<Company>(
    asset.company === 'KHEALTH' ? 'CAREVIEW' : 'KHEALTH'
  );
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [transferredBy, setTransferredBy] = useState(currentUser);
  const [approvedBy, setApprovedBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');

  // New user fields
  const [newFullName, setNewFullName]       = useState('');
  const [newEmployeeId, setNewEmployeeId]   = useState('');
  const [newDepartment, setNewDepartment]   = useState('');
  const [newPosition, setNewPosition]       = useState('');
  const [newContactNo, setNewContactNo]     = useState('');
  const [newDateReceived, setNewDateReceived] = useState(new Date().toISOString().split('T')[0]);
  const [notedBy, setNotedBy]               = useState('');

  const fromCompany = asset.company;
  const fromCompanyColor = getCompanyHexColor(fromCompany);
  const toCompanyColor   = getCompanyHexColor(toCompany);
  const fromCompanyLogo  = getCompanyLogo(fromCompany);
  const toCompanyLogo    = getCompanyLogo(toCompany);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Update asset with new user info + new company
    if (asset._id) {
      await updateAsset(asset._id, {
        ...asset,
        company:    toCompany,
        assignedTo: newFullName    || asset.assignedTo,
        employeeId: newEmployeeId  || asset.employeeId,
        department: newDepartment  || asset.department,
        position:   newPosition    || asset.position,
        status:     'active',
      });
    }

    // Save form record
    if (onSaveFormRecord) {
      onSaveFormRecord({
        formType: 'Asset Transfer',
        assetTag: asset.deviceCode,
        deviceCode: asset.deviceCode,
        relatedAssetId: asset._id,
        employeeName: newFullName || asset.assignedTo,
        department: newDepartment || asset.department,
        company: toCompany,
        fromCompany,
        toCompany,
        brand: asset.brand,
        category: asset.category,
        status: 'Completed',
        details: `Transferred from ${fromCompany} to ${toCompany}. Reason: ${reason}`,
        createdBy: currentUser,
        formData: {
          deviceCode: asset.deviceCode, assetName: asset.name,
          category: asset.category, brand: asset.brand, model: asset.model,
          serialNumber: asset.serialNumber, fromCompany, toCompany,
          transferDate, reason, transferredBy, approvedBy, receivedBy, notes,
          newFullName, newEmployeeId, newDepartment, newPosition, newContactNo,
          newDateReceived, notedBy,
        },
      });
    }

    onTransfer(asset._id!, toCompany, asset.assignedTo, newFullName || asset.assignedTo);
  };

  const handlePrint = async () => {
    if (printRef.current) await printPDF(printRef.current);
  };

  const handleDownload = async () => {
    if (printRef.current) await downloadPDF(printRef.current, `Transfer-Form-${asset.deviceCode}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#162236] rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border dark:border-[#1e3a5f]">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <ArrowRightLeft className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">IT Asset Transfer Form</h2>
              <p className="text-sm text-blue-100">Company Transfer Documentation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2 text-sm">
              Download PDF
            </button>
            <button onClick={handlePrint} className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button onClick={onCancel} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <form id="transfer-form" onSubmit={handleSubmit}>
          <div ref={printRef} className="bg-white max-w-4xl mx-auto">

            {/* Form Header */}
            <div className="border-4 border-gray-800 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <img src={fromCompanyLogo} alt={fromCompany} className="h-12 w-auto" />
                  <ArrowRightLeft className="w-8 h-8 text-gray-400" />
                  <img src={toCompanyLogo} alt={toCompany} className="h-12 w-auto" />
                </div>
                <div className="text-right">
                  <h1 className="text-2xl font-bold text-gray-900">IT ASSET TRANSFER FORM</h1>
                  <p className="text-sm text-gray-600 mt-1">Asset Code: {asset.deviceCode}</p>
                </div>
              </div>
              <div className="border-t-2 border-gray-300 pt-4 mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Transfer Date:</label>
                  <p className="text-sm font-semibold text-gray-900">{new Date(transferDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Document ID:</label>
                  <p className="text-sm font-mono font-semibold text-gray-900">TRF-{asset.deviceCode}-{Date.now()}</p>
                </div>
              </div>
            </div>

            {/* Transfer Details */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">TRANSFER DETAILS</h3>
              <table className="w-full border-collapse border-2 border-gray-800">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700 w-1/3">From Company:</td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold" style={{ color: fromCompanyColor }}>{fromCompany}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">To Company:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <select
                        value={toCompany}
                        onChange={e => setToCompany(e.target.value as Company)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        style={{ color: toCompanyColor }}
                        required
                      >
                        <option value="KHEALTH">KHEALTH</option>
                        <option value="CAREVIEW">CAREVIEW</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">Transfer Date:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Asset Information */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">ASSET INFORMATION</h3>
              <table className="w-full border-collapse border-2 border-gray-800">
                <tbody>
                  {[
                    ['Asset Code',    <span className="font-mono font-semibold">{asset.deviceCode}</span>],
                    ['Asset Name',    asset.name],
                    ['Category',      <span className="capitalize">{asset.category}</span>],
                    ['Brand & Model', `${asset.brand} ${asset.model}`],
                    ['Serial Number', <span className="font-mono">{asset.serialNumber}</span>],
                    ['Current User',  asset.assignedTo || 'Unassigned'],
                    ['Department',    asset.department || 'N/A'],
                  ].map(([label, value]) => (
                    <tr key={label as string}>
                      <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700 w-1/3">{label}:</td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900">{value as any}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* New User Information */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">NEW USER INFORMATION</h3>
              <table className="w-full border-collapse border-2 border-gray-800">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700 w-1/3">Full Name:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <EmployeeNameInput
                        value={newFullName}
                        onChange={val => {
                          setNewFullName(val);
                        }}
                        onSelectEmployee={emp => {
                          setNewFullName(emp.fullName);
                          setNewEmployeeId(emp.employeeId);
                          setNewDepartment(emp.department || '');
                          setNewPosition(emp.position || '');
                        }}
                        placeholder="Type name to search employee..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">Employee ID:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input type="text" value={newEmployeeId} onChange={e => setNewEmployeeId(e.target.value)}
                        placeholder="Employee ID / Badge No."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">Department:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input type="text" value={newDepartment} onChange={e => setNewDepartment(e.target.value)}
                        placeholder="Department"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">Position:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input type="text" value={newPosition} onChange={e => setNewPosition(e.target.value)}
                        placeholder="Job position / title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">Contact No.:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input type="text" value={newContactNo} onChange={e => setNewContactNo(e.target.value)}
                        placeholder="Mobile / office number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">Date Received:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input type="date" value={newDateReceived} onChange={e => setNewDateReceived(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Transfer Reason & Authorization */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">TRANSFER REASON & AUTHORIZATION</h3>
              <table className="w-full border-collapse border-2 border-gray-800">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700 w-1/3">Reason for Transfer:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <textarea value={reason} onChange={e => setReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3} placeholder="Enter reason for transfer..." required />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">Transferred By:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input type="text" value={transferredBy} onChange={e => setTransferredBy(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Name of person transferring" required />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">Approved By:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <EmployeeNameInput
                        value={approvedBy}
                        onChange={setApprovedBy}
                        placeholder="Name of approving authority"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">Received By:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <EmployeeNameInput
                        value={receivedBy}
                        onChange={setReceivedBy}
                        placeholder="Name of receiving person"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">Noted By:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <EmployeeNameInput
                        value={notedBy}
                        onChange={setNotedBy}
                        placeholder="Name of noting authority"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">Additional Notes:</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <textarea value={notes} onChange={e => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2} placeholder="Additional notes or remarks..." />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signature Section */}
            <div className="grid grid-cols-3 gap-6 mt-6">
              {[
                { label: transferredBy || 'Transferred By', sub: 'Transferring Party' },
                { label: approvedBy || 'Approved By',       sub: 'Authorized Signatory' },
                { label: newFullName || 'Received By',      sub: 'New User / Receiving Party' },
              ].map(({ label, sub }) => (
                <div key={sub} className="text-center">
                  <div className="border-b-2 border-gray-700 mb-2 h-10" />
                  <p className="text-xs font-semibold text-gray-700 uppercase">{label}</p>
                  <p className="text-xs text-gray-500">{sub}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t-2 border-gray-300 pt-4 mt-6 text-center">
              <p className="text-xs text-gray-600">Asset Code: {asset.deviceCode}</p>
            </div>
          </div>
          </form>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-50 dark:bg-[#1e2d4a] px-6 py-4 border-t border-gray-200 dark:border-[#1e3a5f] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#243352] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="transfer-form"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Complete Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
