import { useRef, useState } from 'react';
import { X, Printer, Download, UserPlus, Save, CheckCircle2 } from 'lucide-react';
import type { ITAsset, Company } from '@/types/inventory';
import { getCompanyLogo, getCompanyHexColor } from '@/utils/device-code';
import { downloadPDF, printPDF } from '@/utils/pdf';
import { useFormRecordStore } from '@/store/formRecordStore';
import { useAssetStore } from '@/store/assetStore';
import { employeeServices } from '@/services/employeeServices';
import type { Employee } from '@/store/employeeStore';

interface Props {
  asset: ITAsset;
  toCompany: Company;
  fromCompany: Company;
  transferDate: string;
  transferredBy: string;
  approvedBy: string;
  onClose: () => void;
  currentUser?: string;
}

export function NewUserTransferForm({
  asset, toCompany, fromCompany, transferDate, transferredBy, approvedBy, onClose, currentUser,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addFormRecord } = useFormRecordStore();
  const { updateAsset } = useAssetStore();
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Autocomplete state
  const [nameSuggestions, setNameSuggestions] = useState<Employee[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nameSearchLoading, setNameSearchLoading] = useState(false);

  // Editable fields for the new user
  const [fullName, setFullName]       = useState('');
  const [employeeId, setEmployeeId]   = useState('');
  const [department, setDepartment]   = useState('');
  const [position, setPosition]       = useState('');
  const [contactNo, setContactNo]     = useState('');
  const [dateReceived, setDateReceived] = useState(transferDate);
  const [notedBy, setNotedBy]         = useState('');
  const [remarks, setRemarks]         = useState('');

  const toLogo    = getCompanyLogo(toCompany);
  const fromLogo  = getCompanyLogo(fromCompany);
  const toColor   = getCompanyHexColor(toCompany);
  const fromColor = getCompanyHexColor(fromCompany);

  const toCompanyName = toCompany === 'KHEALTH' ? 'KHEALTH CORPORATION'
    : toCompany === 'CAREVIEW' ? 'CAREVIEW COMMUNICATIONS'
    : 'GLOWFIND';

  const docId = `RCPT-${asset.deviceCode}-${Date.now()}`;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFullName(value);
    setShowSuggestions(false);
    setNameSuggestions([]);
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    if (!value.trim() || value.trim().length < 2) return;
    nameTimerRef.current = setTimeout(async () => {
      setNameSearchLoading(true);
      try {
        const data = await employeeServices.getEmployees({ search: value.trim(), limit: 8 });
        const list = data.employees ?? [];
        setNameSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch {
        setNameSuggestions([]);
      } finally {
        setNameSearchLoading(false);
      }
    }, 300);
  };

  const handleSelectSuggestion = (emp: Employee) => {
    setFullName(emp.fullName);
    setEmployeeId(emp.employeeId);
    setDepartment(emp.department || '');
    setPosition(emp.position || '');
    setShowSuggestions(false);
    setNameSuggestions([]);
  };

  const saveRecord = async () => {
    if (saved || isSaving) return;
    if (!asset._id) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      // Update the asset with the new user's information
      await updateAsset(asset._id, {
        ...asset,
        assignedTo:  fullName     || asset.assignedTo,
        employeeId:  employeeId   || asset.employeeId,
        department:  department   || asset.department,
        position:    position     || asset.position,
        company:     toCompany,
        status:      'active',
      });

      // Log the form record
      await addFormRecord({
        formType: 'New User Transfer',
        deviceCode: asset.deviceCode,
        assetTag: asset.deviceCode,
        relatedAssetId: asset._id,
        employeeName: fullName || undefined,
        department: department || undefined,
        position: position || undefined,
        company: toCompany,
        fromCompany,
        toCompany,
        brand: asset.brand,
        category: asset.category,
        name: asset.name,
        status: 'Active',
        details: `New user transfer: ${asset.deviceCode} → ${fullName || 'Unknown'}`,
        createdBy: currentUser || transferredBy || 'Admin',
        formData: { fullName, employeeId, department, position, contactNo, dateReceived, notedBy, remarks, transferredBy, approvedBy },
      });

      setSaved(true);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (printRef.current) await downloadPDF(printRef.current, `NewUser-Form-${asset.deviceCode}.pdf`);
  };
  const handlePrint = async () => {
    if (printRef.current) await printPDF(printRef.current);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white dark:bg-[#162236] rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col border dark:border-[#1e3a5f]">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">New User — Asset Acceptance Form</h2>
              <p className="text-sm text-green-100">Fill in the receiving user's information</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div ref={printRef} className="bg-white max-w-2xl mx-auto">

            {/* Document Header */}
            <div className="border-4 border-gray-800 p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {fromLogo && <img src={fromLogo} alt={fromCompany} className="h-10 w-auto" />}
                  <span className="text-gray-400 text-lg font-bold">→</span>
                  {toLogo && <img src={toLogo} alt={toCompany} className="h-10 w-auto" />}
                </div>
                <div className="text-right">
                  <h1 className="text-xl font-bold text-gray-900 uppercase">Asset Acceptance Form</h1>
                  <p className="text-sm text-gray-600 mt-0.5">New User — Receiving Copy</p>
                </div>
              </div>
              <div className="border-t-2 border-gray-300 pt-3 grid grid-cols-2 gap-3 mt-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Document ID</p>
                  <p className="text-sm font-mono font-bold text-gray-800">{docId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Transfer Date</p>
                  <p className="text-sm font-bold text-gray-800">
                    {new Date(transferDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">From Company</p>
                  <p className="text-sm font-bold" style={{ color: fromColor }}>{fromCompany}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Receiving Company</p>
                  <p className="text-sm font-bold" style={{ color: toColor }}>{toCompany}</p>
                </div>
              </div>
            </div>

            {/* Asset Information (read-only) */}
            <div className="mb-5">
              <h3 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b-2 border-gray-300 uppercase tracking-wide">
                Asset Information
              </h3>
              <table className="w-full border-collapse border-2 border-gray-700 text-sm">
                <tbody>
                  {[
                    ['Asset Code',    asset.deviceCode],
                    ['Asset Name',    asset.name],
                    ['Category',      asset.category],
                    ['Brand / Model', `${asset.brand} ${asset.model}`],
                    ['Serial Number', asset.serialNumber],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td className="border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700 w-1/3">{label}</td>
                      <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900 font-mono">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* New User Information (editable) */}
            <div className="mb-5">
              <h3 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b-2 border-gray-300 uppercase tracking-wide">
                Receiving User Information
              </h3>
              <table className="w-full border-collapse border-2 border-gray-700 text-sm">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700 w-1/3">Full Name</td>
                    <td className="border border-gray-300 px-3 py-1.5">
                      <div className="relative">
                        <input
                          type="text"
                          value={fullName}
                          onChange={handleNameChange}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                          onFocus={() => nameSuggestions.length > 0 && setShowSuggestions(true)}
                          placeholder="Type name to search employee..."
                          autoComplete="off"
                          className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
                        />
                        {nameSearchLoading && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                        )}
                        {showSuggestions && nameSuggestions.length > 0 && (
                          <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {nameSuggestions.map(emp => (
                              <li
                                key={emp._id ?? emp.employeeId}
                                onMouseDown={() => handleSelectSuggestion(emp)}
                                className="px-3 py-2 cursor-pointer hover:bg-green-50 border-b border-gray-100 last:border-0"
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
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700">Employee ID</td>
                    <td className="border border-gray-300 px-3 py-1.5">
                      <input
                        type="text"
                        value={employeeId}
                        onChange={e => setEmployeeId(e.target.value)}
                        placeholder="Employee ID / Badge No."
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700">Department</td>
                    <td className="border border-gray-300 px-3 py-1.5">
                      <input
                        type="text"
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        placeholder="Department"
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700">Position</td>
                    <td className="border border-gray-300 px-3 py-1.5">
                      <input
                        type="text"
                        value={position}
                        onChange={e => setPosition(e.target.value)}
                        placeholder="Job position / title"
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700">Contact No.</td>
                    <td className="border border-gray-300 px-3 py-1.5">
                      <input
                        type="text"
                        value={contactNo}
                        onChange={e => setContactNo(e.target.value)}
                        placeholder="Mobile / office number"
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700">Date Received</td>
                    <td className="border border-gray-300 px-3 py-1.5">
                      <input
                        type="date"
                        value={dateReceived}
                        onChange={e => setDateReceived(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700">Remarks</td>
                    <td className="border border-gray-300 px-3 py-1.5">
                      <textarea
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        rows={2}
                        placeholder="Additional remarks or notes..."
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-green-500 focus:outline-none text-sm resize-none"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Authorization (pre-filled, editable) */}
            <div className="mb-5">
              <h3 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b-2 border-gray-300 uppercase tracking-wide">
                Authorization
              </h3>
              <table className="w-full border-collapse border-2 border-gray-700 text-sm">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700 w-1/3">Transferred By</td>
                    <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">{transferredBy || '—'}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700">Approved By</td>
                    <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">{approvedBy || '—'}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700">Noted By</td>
                    <td className="border border-gray-300 px-3 py-1.5">
                      <input
                        type="text"
                        value={notedBy}
                        onChange={e => setNotedBy(e.target.value)}
                        placeholder="Name of noting authority"
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signature Section */}
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div className="text-center">
                <div className="border-b-2 border-gray-700 mb-2 h-10" />
                <p className="text-xs font-semibold text-gray-700 uppercase">
                  {fullName || 'Signature of New User'}
                </p>
                <p className="text-xs text-gray-500">Receiving User</p>
              </div>
              <div className="text-center">
                <div className="border-b-2 border-gray-700 mb-2 h-10" />
                <p className="text-xs font-semibold text-gray-700 uppercase">
                  {notedBy || 'Noted By'}
                </p>
                <p className="text-xs text-gray-500">Authorized Representative</p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-gray-300 pt-3 mt-5 text-center">
              <p className="text-xs text-gray-500">
                Asset Code: {asset.deviceCode} · {toCompanyName} · {docId}
              </p>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-[#1e3a5f] bg-gray-50 dark:bg-[#1e2d4a] flex-shrink-0">
          {/* Save status indicator */}
          <div>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Asset updated &amp; saved to records
              </span>
            )}
            {saveError && (
              <span className="text-sm text-red-500">{saveError}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#243352] transition-colors text-sm"
            >
              Close
            </button>
            <button
              onClick={saveRecord}
              disabled={saved || isSaving}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-semibold"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : saved ? 'Saved' : 'Save Record'}
            </button>
            <button
              onClick={handleDownload}
              className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-semibold"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
