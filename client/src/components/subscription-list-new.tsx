import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Calendar, DollarSign, Building2, FileText, Download, AlertCircle, CreditCard, X, Key, Eye, FileEdit, Smartphone } from 'lucide-react';
import { getCompanyBadgeClasses, generateLicenseSubscriptionCode } from '@/utils/device-code';
import type { Company, ITAsset, FormRecord } from '@/types/inventory';
import type { Subscription } from '@/types/subscription';
import { AssetRecordForm } from '@/components/asset-record-form';
import { employeeServices } from '@/services/employeeServices';
import { useAuthStore } from '@/store/authStore';

interface SubscriptionListProps {
  company: Company | 'ALL';
  onCompanyChange: (company: Company | 'ALL') => void;
  subscriptions?: Subscription[];
  onAddSubscription?: (subscription: Omit<Subscription, 'id'>) => void;
  onEditSubscription?: (id: string, subscription: Omit<Subscription, 'id'>) => void;
  onDeleteSubscription?: (id: string) => void;
  onViewSubscription?: (subscription: Subscription) => void;
  onRequestEdit?: (subscription: Subscription) => void;
  editRequestSubscription?: Subscription | null;
  assets?: ITAsset[];
  assetCategories?: string[];
  onAddCategory?: (category: string) => void;
  onDeleteCategory?: (category: string) => void;
  defaultCategories?: string[];
  onSaveFormRecord?: (record: Omit<FormRecord, 'id' | 'dateCreated'>) => void;
  currentUser?: string;
}

const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: '1',
    referenceCode: 'KH-SUB-0001',
    type: 'Subscription',
    employeeName: 'John Martinez',
    company: 'KHEALTH',
    branch: 'Main Office',
    department: 'IT Department',
    subscriptionName: 'Microsoft 365 Business Premium',
    accountNumber: 'MS-KHEALTH-2024-001',
    accountDescription: 'Enterprise email and collaboration platform',
    accountName: 'KHEALTH IT Admin',
    accountEmail: 'admin@khealth.com',
    name: 'Microsoft 365 Business Premium',
    provider: 'Microsoft',
    planType: 'Business Premium',
    category: 'SaaS',
    status: 'Active',
    billingCycle: 'Monthly',
    cost: 12.50,
    currency: '$',
    purchaseDate: '2024-01-15',
    renewalDate: '2026-02-15',
    notes: '50 user licenses for all staff - Auto-renewal enabled',
    modeOfPayment: 'Credit Card',
    modeOfPaymentNote: 'Corporate Visa ending in 4567 - Auto-debit on 15th',
    startDate: '2024-01-15',
    autoRenewal: true,
  },
  {
    id: '2',
    referenceCode: 'KH-LIC-0001',
    type: 'License',
    employeeName: 'Sarah Chen',
    company: 'KHEALTH',
    branch: 'Main Office',
    department: 'Design Team',
    licenseKey: 'ADOBE-CC-2024-XXXX-XXXX-XXXX-5678',
    numberOfSeats: 10,
    name: 'Adobe Creative Cloud License',
    provider: 'Adobe',
    category: 'Software',
    status: 'Active',
    billingCycle: 'Annually',
    cost: 599.99,
    currency: '$',
    purchaseDate: '2024-03-01',
    renewalDate: '2026-03-01',
    notes: 'For design team only - Includes Photoshop, Illustrator, InDesign',
    modeOfPayment: 'Deposit',
    modeOfPaymentNote: 'Bank transfer - BDO Account #123456789',
    startDate: '2024-03-01',
    autoRenewal: true,
  },
  {
    id: '3',
    referenceCode: 'CV-SUB-0002',
    type: 'Subscription',
    employeeName: 'Mark Rodriguez',
    company: 'CAREVIEW',
    branch: 'Remote',
    department: 'Development',
    subscriptionName: 'GitHub Team Plan',
    accountNumber: 'GH-CAREVIEW-TEAM-2024',
    accountDescription: 'Source code repository and collaboration',
    accountName: 'CAREVIEW DevOps',
    accountEmail: 'devops@careview.com',
    name: 'GitHub Team Plan',
    provider: 'GitHub',
    planType: 'Team',
    category: 'SaaS',
    status: 'Active',
    billingCycle: 'Monthly',
    cost: 4500,
    currency: '₱',
    purchaseDate: '2024-02-01',
    renewalDate: '2026-03-01',
    notes: '15 developer seats - CI/CD integration included',
    modeOfPayment: 'Credit Card',
    modeOfPaymentNote: 'Mastercard ending in 9012 - Monthly billing',
    startDate: '2024-02-01',
    autoRenewal: true,
  },
  {
    id: '4',
    referenceCode: 'CV-LIC-0002',
    type: 'License',
    employeeName: 'Lisa Tan',
    company: 'CAREVIEW',
    branch: 'Main Office',
    department: 'Operations',
    licenseKey: 'JIRA-SW-2024-XXXX-YYYY-ZZZZ-1234',
    numberOfSeats: 25,
    name: 'Atlassian Jira Software License',
    provider: 'Atlassian',
    category: 'Software',
    status: 'Active',
    billingCycle: 'Annually',
    cost: 35000,
    currency: '₱',
    purchaseDate: '2024-01-10',
    renewalDate: '2026-01-10',
    notes: 'Project management for all teams - Includes Confluence',
    modeOfPayment: 'Cash',
    modeOfPaymentNote: 'Paid via petty cash - Receipt #PC-2024-0045',
    startDate: '2024-01-10',
    autoRenewal: false,
  },
  {
    id: '5',
    referenceCode: 'GF-SUB-0003',
    type: 'Subscription',
    employeeName: 'Alex Santos',
    company: 'GLOWFIND',
    branch: 'Marketing Office',
    department: 'Marketing',
    subscriptionName: 'Canva Pro Team',
    accountNumber: 'CANVA-GF-PRO-2024',
    accountDescription: 'Design and marketing content creation platform',
    accountName: 'GLOWFIND Marketing',
    accountEmail: 'marketing@glowfind.com',
    name: 'Canva Pro Team',
    provider: 'Canva',
    planType: 'Pro Team',
    category: 'SaaS',
    status: 'Active',
    billingCycle: 'Annually',
    cost: 15000,
    currency: '₱',
    purchaseDate: '2024-04-01',
    renewalDate: '2026-04-01',
    notes: '20 team members - Brand kit and templates included',
    modeOfPayment: 'Credit Card',
    modeOfPaymentNote: 'Company Amex ending in 3456 - Annual payment',
    startDate: '2024-04-01',
    autoRenewal: true,
  },
  {
    id: '6',
    referenceCode: 'GF-LIC-0003',
    type: 'License',
    employeeName: 'Diana Lopez',
    company: 'GLOWFIND',
    branch: 'Main Office',
    department: 'Finance',
    licenseKey: 'QUICKBOOKS-ENT-2024-XXXX-5678-ABCD',
    numberOfSeats: 5,
    name: 'QuickBooks Enterprise License',
    provider: 'Intuit',
    category: 'Software',
    status: 'Active',
    billingCycle: 'Annually',
    cost: 85000,
    currency: '₱',
    purchaseDate: '2024-01-05',
    renewalDate: '2026-01-05',
    notes: 'Financial management software - Advanced reporting module',
    modeOfPayment: 'Deposit',
    modeOfPaymentNote: 'BPI Bank transfer - Confirmation #TRF-2024-0123',
    startDate: '2024-01-05',
    autoRenewal: true,
  },
];

export function SubscriptionList({ company, onCompanyChange, subscriptions: propSubscriptions, onAddSubscription, onEditSubscription, onDeleteSubscription, onViewSubscription, onRequestEdit, editRequestSubscription, assets, assetCategories, onAddCategory, onDeleteCategory, defaultCategories, onSaveFormRecord, currentUser }: SubscriptionListProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'encoder';

  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(propSubscriptions || MOCK_SUBSCRIPTIONS);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deletingSubscription, setDeletingSubscription] = useState<Subscription | null>(null);
  const [showAssetForm, setShowAssetForm] = useState(false);
  // Employee name autocomplete
  const [empSuggestions, setEmpSuggestions] = useState<{ _id?: string; fullName: string; employeeId: string; position: string; department: string }[]>([]);
  const [showEmpSuggestions, setShowEmpSuggestions] = useState(false);
  const [empNameLoading, setEmpNameLoading] = useState(false);
  const empTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    // Type selection
    type: 'Subscription' as 'License' | 'Subscription',
    
    // Employee Information
    employeeName: '',
    company: 'KHEALTH' as Company,
    branch: '',
    department: '',
    
    // License Details
    licenseKey: '',
    numberOfSeats: '',
    
    // Subscription Details
    subscriptionName: '',
    accountNumber: '',
    accountDescription: '',
    accountName: '',
    accountEmail: '',
    
    // Common
    provider: '',
    planType: '',
    
    // Settings
    category: '',
    status: 'Active' as const,
    billingCycle: 'Monthly' as const,
    cost: '',
    currency: '$' as '$' | '₱',
    purchaseDate: '',
    renewalDate: '',
    notes: '',
    modeOfPayment: 'Credit Card' as 'Credit Card' | 'Cash' | 'Deposit',
    modeOfPaymentNote: '',
    deviceId: '' // Link to IT Asset
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      type: 'Subscription',
      employeeName: '',
      company: 'KHEALTH',
      branch: '',
      department: '',
      licenseKey: '',
      numberOfSeats: '',
      subscriptionName: '',
      accountNumber: '',
      accountDescription: '',
      accountName: '',
      accountEmail: '',
      provider: '',
      planType: '',
      category: '',
      status: 'Active',
      billingCycle: 'Monthly',
      cost: '',
      currency: '$',
      purchaseDate: '',
      renewalDate: '',
      notes: '',
      modeOfPayment: 'Credit Card',
      modeOfPaymentNote: '',
      deviceId: ''
    });
    setShowAssetForm(false);
  };

  const handleEmpNameChange = (value: string) => {
    handleInputChange('employeeName', value);
    setShowEmpSuggestions(false);
    setEmpSuggestions([]);

    if (empTimerRef.current) clearTimeout(empTimerRef.current);
    if (!value.trim() || value.trim().length < 2) return;

    empTimerRef.current = setTimeout(async () => {
      setEmpNameLoading(true);
      try {
        const data = await employeeServices.getEmployees({ search: value.trim(), limit: 8 });
        const list = data.employees ?? [];
        setEmpSuggestions(list);
        setShowEmpSuggestions(list.length > 0);
      } catch {
        setEmpSuggestions([]);
      } finally {
        setEmpNameLoading(false);
      }
    }, 300);
  };

  const handleSelectEmpSuggestion = (emp: typeof empSuggestions[0]) => {
    handleInputChange('employeeName', emp.fullName);
    if (emp.department) handleInputChange('department', emp.department);
    setShowEmpSuggestions(false);
    setEmpSuggestions([]);
  };

  const handleAddSubscription = () => {
    // Validation
    if (!formData.provider || !formData.provider.trim()) {
      alert('❌ Service Provider is required');
      return;
    }

    if (!formData.cost || parseFloat(formData.cost) <= 0) {
      alert('❌ Cost must be greater than 0');
      return;
    }

    if (!formData.renewalDate) {
      alert('❌ Renewal Date is required');
      return;
    }

    // Type-specific validation
    if (formData.type === 'License') {
      if (!formData.licenseKey || !formData.licenseKey.trim()) {
        alert('❌ License Key / Code is required for License type');
        return;
      }
    } else if (formData.type === 'Subscription') {
      if (!formData.subscriptionName || !formData.subscriptionName.trim()) {
        alert('❌ Subscription Name is required for Subscription type');
        return;
      }
    }

    // Generate reference code with global sequential numbering
    const referenceCode = generateLicenseSubscriptionCode(formData.company, formData.type, subscriptions);
    
    const newSubscription: Subscription = {
      id: Date.now().toString(),
      referenceCode,
      type: formData.type,
      employeeName: formData.employeeName || undefined,
      company: formData.company,
      branch: formData.branch || undefined,
      department: formData.department || undefined,
      licenseKey: formData.type === 'License' ? formData.licenseKey : undefined,
      numberOfSeats: formData.type === 'License' && formData.numberOfSeats ? parseInt(formData.numberOfSeats) : undefined,
      subscriptionName: formData.type === 'Subscription' ? formData.subscriptionName : undefined,
      accountNumber: formData.type === 'Subscription' ? formData.accountNumber : undefined,
      accountDescription: formData.type === 'Subscription' ? formData.accountDescription : undefined,
      accountName: formData.type === 'Subscription' ? formData.accountName : undefined,
      accountEmail: formData.type === 'Subscription' ? formData.accountEmail : undefined,
      name: formData.type === 'License' ? `${formData.provider} License` : (formData.subscriptionName || formData.provider),
      provider: formData.provider,
      planType: formData.planType || undefined,
      category: formData.category || undefined,
      status: formData.status,
      billingCycle: formData.billingCycle,
      cost: parseFloat(formData.cost),
      currency: formData.currency,
      purchaseDate: formData.purchaseDate || undefined,
      renewalDate: formData.renewalDate,
      notes: formData.notes || undefined,
      modeOfPayment: formData.modeOfPayment,
      modeOfPaymentNote: formData.modeOfPaymentNote,
      startDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
      autoRenewal: true,
      deviceId: formData.deviceId || undefined,
    };

    // Update local state
    setSubscriptions([...subscriptions, newSubscription]);
    
    // Call parent callback if provided
    if (onAddSubscription) {
      onAddSubscription(newSubscription);
    }
    
    // Close modal and reset
    setShowAddModal(false);
    resetForm();
    
    // Success message
    alert(`✅ ${formData.type} successfully added!\n\n📋 Reference Code: ${referenceCode}\n💼 Company: ${formData.company}\n🔑 Provider: ${formData.provider}\n💰 Cost: ${formData.currency}${parseFloat(formData.cost).toLocaleString()}\n📅 Renewal: ${new Date(formData.renewalDate).toLocaleDateString()}`);
  };

  const handleDeleteSubscription = () => {
    if (deletingSubscription) {
      setSubscriptions(subscriptions.filter(s => s.id !== deletingSubscription.id));
      if (onDeleteSubscription) onDeleteSubscription(deletingSubscription.id);
      setShowDeleteModal(false);
      setDeletingSubscription(null);
    }
  };

  const openEditModal = (sub: Subscription) => {
    setEditingSubscription(sub);
    setFormData({
      type: sub.type,
      employeeName: sub.employeeName || '',
      company: sub.company,
      branch: sub.branch || '',
      department: sub.department || '',
      licenseKey: sub.licenseKey || '',
      numberOfSeats: sub.numberOfSeats?.toString() || '',
      subscriptionName: sub.subscriptionName || '',
      accountNumber: sub.accountNumber || '',
      accountDescription: sub.accountDescription || '',
      accountName: sub.accountName || '',
      accountEmail: sub.accountEmail || '',
      provider: sub.provider,
      planType: sub.planType || '',
      category: sub.category || '',
      status: sub.status as any,
      billingCycle: sub.billingCycle as any,
      cost: sub.cost.toString(),
      currency: sub.currency as '$' | '₱',
      purchaseDate: sub.purchaseDate || '',
      renewalDate: sub.renewalDate,
      notes: sub.notes || '',
      modeOfPayment: (sub.modeOfPayment as any) || 'Credit Card',
      modeOfPaymentNote: sub.modeOfPaymentNote || '',
      deviceId: sub.deviceId || '',
    });
    setShowAddModal(true);
  };

  useEffect(() => {
    if (editRequestSubscription) openEditModal(editRequestSubscription);
  }, [editRequestSubscription]);

  const handleEditSubscriptionSubmit = () => {
    if (!editingSubscription) return;
    if (!formData.provider?.trim()) { alert('❌ Service Provider is required'); return; }
    if (!formData.cost || parseFloat(formData.cost) <= 0) { alert('❌ Cost must be greater than 0'); return; }
    if (!formData.renewalDate) { alert('❌ Renewal Date is required'); return; }

    const updated: Subscription = {
      ...editingSubscription,
      type: formData.type,
      employeeName: formData.employeeName || undefined,
      company: formData.company,
      branch: formData.branch || undefined,
      department: formData.department || undefined,
      licenseKey: formData.type === 'License' ? formData.licenseKey : undefined,
      numberOfSeats: formData.type === 'License' && formData.numberOfSeats ? parseInt(formData.numberOfSeats) : undefined,
      subscriptionName: formData.type === 'Subscription' ? formData.subscriptionName : undefined,
      accountNumber: formData.type === 'Subscription' ? formData.accountNumber : undefined,
      accountDescription: formData.type === 'Subscription' ? formData.accountDescription : undefined,
      accountName: formData.type === 'Subscription' ? formData.accountName : undefined,
      accountEmail: formData.type === 'Subscription' ? formData.accountEmail : undefined,
      name: formData.type === 'License' ? `${formData.provider} License` : (formData.subscriptionName || formData.provider),
      provider: formData.provider,
      planType: formData.planType || undefined,
      category: formData.category || undefined,
      status: formData.status,
      billingCycle: formData.billingCycle,
      cost: parseFloat(formData.cost),
      currency: formData.currency,
      purchaseDate: formData.purchaseDate || undefined,
      renewalDate: formData.renewalDate,
      notes: formData.notes || undefined,
      modeOfPayment: formData.modeOfPayment,
      modeOfPaymentNote: formData.modeOfPaymentNote,
      deviceId: formData.deviceId || undefined,
    };

    setSubscriptions(subscriptions.map(s => s.id === editingSubscription.id ? updated : s));
    if (onEditSubscription) onEditSubscription(editingSubscription.id, updated);
    setShowAddModal(false);
    setEditingSubscription(null);
    resetForm();
  };

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         subscription.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         subscription.referenceCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = company === 'ALL' || subscription.company === company;
    const matchesCategory = selectedCategory === 'All' || subscription.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || subscription.status === selectedStatus;
    
    return matchesSearch && matchesCompany && matchesCategory && matchesStatus;
  });

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(subscriptions.map(s => s.category).filter(Boolean)))];
  const statuses = ['All', 'Active', 'Expired', 'Pending', 'Cancelled'];

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Expired':
        return 'bg-red-100 text-red-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, provider, or reference code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Add Subscription
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
          <select
            value={company}
            onChange={(e) => onCompanyChange(e.target.value as Company)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">All Companies</option>
            <option value="KHEALTH">KHEALTH</option>
            <option value="CAREVIEW">CAREVIEW</option>
            <option value="GLOWFIND">GLOWFIND</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renewal Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => {
                  const isExpiringSoon = new Date(subscription.renewalDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  const daysUntilRenewal = Math.ceil((new Date(subscription.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <p className="text-sm font-mono font-semibold text-gray-900">{subscription.referenceCode}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          subscription.type === 'License' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {subscription.type === 'License' && <Key className="w-3 h-3 inline mr-1" />}
                          {subscription.type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900">{subscription.name}</p>
                        {subscription.category && (
                          <p className="text-xs text-gray-500 mt-1">{subscription.category}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900">{subscription.provider}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900">{subscription.employeeName || '-'}</p>
                        {subscription.department && (
                          <p className="text-xs text-gray-500 mt-1">{subscription.department}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={getCompanyBadgeClasses(subscription.company)}>
                          {subscription.company}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900">
                          {subscription.currency}{subscription.cost.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{subscription.billingCycle}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm text-gray-900">
                            {new Date(subscription.renewalDate).toLocaleDateString()}
                          </p>
                          {isExpiringSoon && subscription.status === 'Active' && (
                            <p className="text-xs text-yellow-600 font-medium mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {daysUntilRenewal} days left
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadgeClasses(subscription.status)}`}>
                          {subscription.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors"
                            title="View Details"
                            onClick={() => onViewSubscription?.(subscription)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button
                              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded transition-colors"
                              title="Edit"
                              onClick={() => openEditModal(subscription)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                              title="Delete"
                              onClick={() => {
                                setDeletingSubscription(subscription);
                                setShowDeleteModal(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingSubscription ? 'Edit License/Subscription' : 'Add License/Subscription'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSubscription(null);
                  resetForm();
                }}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form>
                {/* Employee Information Section */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Employee Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.employeeName}
                          onChange={(e) => handleEmpNameChange(e.target.value)}
                          onBlur={() => setTimeout(() => setShowEmpSuggestions(false), 150)}
                          onFocus={() => empSuggestions.length > 0 && setShowEmpSuggestions(true)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Type name to search..."
                          autoComplete="off"
                        />
                        {empNameLoading && (
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                      {showEmpSuggestions && empSuggestions.length > 0 && (
                        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-[#1e2d4a] border border-gray-200 dark:border-[#1e3a5f] rounded-lg shadow-lg max-h-52 overflow-y-auto">
                          {empSuggestions.map(emp => (
                            <li
                              key={emp._id ?? emp.employeeId}
                              onMouseDown={() => handleSelectEmpSuggestion(emp)}
                              className="px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#243352] border-b border-gray-100 dark:border-[#1e3a5f] last:border-0"
                            >
                              <p className="font-medium text-sm text-gray-900 dark:text-white">{emp.fullName}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">
                                {emp.employeeId}
                                {emp.department ? ` · ${emp.department}` : ''}
                                {emp.position  ? ` · ${emp.position}`  : ''}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                      <select
                        value={formData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="KHEALTH">KHEALTH</option>
                        <option value="CAREVIEW">CAREVIEW</option>
                        <option value="GLOWFIND">GLOWFIND</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch/Location</label>
                      <input
                        type="text"
                        value={formData.branch}
                        onChange={(e) => handleInputChange('branch', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Main Office, Remote"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., IT, Sales, Marketing"
                      />
                    </div>
                  </div>
                </div>

                {/* Type Selection */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    License or Subscription *
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleInputChange('type', 'License')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.type === 'License'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Key className={`w-6 h-6 ${formData.type === 'License' ? 'text-blue-600' : 'text-gray-600'}`} />
                      </div>
                      <p className={`font-semibold ${formData.type === 'License' ? 'text-blue-900' : 'text-gray-900'}`}>
                        License
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Software license with key/code
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInputChange('type', 'Subscription')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.type === 'Subscription'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <CreditCard className={`w-6 h-6 ${formData.type === 'Subscription' ? 'text-blue-600' : 'text-gray-600'}`} />
                      </div>
                      <p className={`font-semibold ${formData.type === 'Subscription' ? 'text-blue-900' : 'text-gray-900'}`}>
                        Subscription
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Recurring service subscription
                      </p>
                    </button>
                  </div>
                </div>

                {/* Auto-Generated Reference Code Preview */}
                <div className="mb-6">
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900 mb-1">
                          Auto-Generated Reference Code
                        </p>
                        <div className="bg-white border border-blue-200 rounded-md px-3 py-2 mb-2">
                          <p className="text-lg font-mono font-bold text-blue-700">
                            {generateLicenseSubscriptionCode(formData.company, formData.type, subscriptions)}
                          </p>
                        </div>
                        <p className="text-xs text-blue-800">
                          Format: <strong>Company Prefix</strong> + <strong>Type Code</strong> + <strong>Sequential Number</strong>
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          ({formData.company === 'KHEALTH' ? 'KH' : formData.company === 'CAREVIEW' ? 'CV' : 'GF'}) + 
                          ({formData.type === 'License' ? 'LIC' : 'SUB'}) + 
                          (Global Sequential: {String(subscriptions.filter(s => s.type === formData.type).length + 1).padStart(4, '0')})
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LICENSE FORM */}
                {formData.type === 'License' && (
                  <>
                    {/* License Details Section */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                        License Details
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Service Provider *</label>
                          <input
                            type="text"
                            value={formData.provider}
                            onChange={(e) => handleInputChange('provider', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Microsoft, Adobe"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">License Key / Code *</label>
                          <input
                            type="text"
                            value={formData.licenseKey}
                            onChange={(e) => handleInputChange('licenseKey', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Seats</label>
                          <input
                            type="number"
                            value={formData.numberOfSeats}
                            onChange={(e) => handleInputChange('numberOfSeats', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., 10"
                            min="1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* License Settings Section */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                        License Settings
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">License Status *</label>
                          <select
                            value={formData.status}
                            onChange={(e) => handleInputChange('status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Active">Active</option>
                            <option value="Expired">Expired</option>
                            <option value="Pending">Pending</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Billing Option *</label>
                          <select
                            value={formData.billingCycle}
                            onChange={(e) => handleInputChange('billingCycle', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Annually">Annually</option>
                            <option value="One-time">One-time</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cost *</label>
                          <div className="flex gap-2">
                            <select
                              value={formData.currency}
                              onChange={(e) => handleInputChange('currency', e.target.value)}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="$">$</option>
                              <option value="₱">₱</option>
                            </select>
                            <input
                              type="number"
                              value={formData.cost}
                              onChange={(e) => handleInputChange('cost', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0.00"
                              step="0.01"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                          <input
                            type="date"
                            value={formData.purchaseDate}
                            onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date *</label>
                          <input
                            type="date"
                            value={formData.renewalDate}
                            onChange={(e) => handleInputChange('renewalDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Mode of Payment</label>
                          <select
                            value={formData.modeOfPayment}
                            onChange={(e) => handleInputChange('modeOfPayment', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Credit Card">Credit Card</option>
                            <option value="Cash">Cash</option>
                            <option value="Deposit">Deposit</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Note</label>
                          <input
                            type="text"
                            value={formData.modeOfPaymentNote}
                            onChange={(e) => handleInputChange('modeOfPaymentNote', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Additional payment details"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            placeholder="Additional notes or comments"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* SUBSCRIPTION FORM */}
                {formData.type === 'Subscription' && (
                  <>
                    {/* Subscription Details Section */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                        Subscription Details
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Service Provider *</label>
                          <input
                            type="text"
                            value={formData.provider}
                            onChange={(e) => handleInputChange('provider', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Microsoft, Adobe, AWS"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Name *</label>
                          <input
                            type="text"
                            value={formData.subscriptionName}
                            onChange={(e) => handleInputChange('subscriptionName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Office 365 Business Premium"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
                          <input
                            type="text"
                            value={formData.planType}
                            onChange={(e) => handleInputChange('planType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Enterprise, Business, Premium"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Account No.</label>
                          <input
                            type="text"
                            value={formData.accountNumber}
                            onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Account or Customer ID"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Account Description</label>
                          <input
                            type="text"
                            value={formData.accountDescription}
                            onChange={(e) => handleInputChange('accountDescription', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Brief description of the subscription"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                          <input
                            type="text"
                            value={formData.accountName}
                            onChange={(e) => handleInputChange('accountName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Account holder name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Account Email</label>
                          <input
                            type="email"
                            value={formData.accountEmail}
                            onChange={(e) => handleInputChange('accountEmail', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="account@company.com"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Subscription Settings Section */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                        Subscription Settings
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Status *</label>
                          <select
                            value={formData.status}
                            onChange={(e) => handleInputChange('status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Active">Active</option>
                            <option value="Expired">Expired</option>
                            <option value="Pending">Pending</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                          <input
                            type="text"
                            value={formData.category}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., SaaS, Cloud Service, Software"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Billing Option *</label>
                          <select
                            value={formData.billingCycle}
                            onChange={(e) => handleInputChange('billingCycle', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Annually">Annually</option>
                            <option value="One-time">One-time</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cost *</label>
                          <div className="flex gap-2">
                            <select
                              value={formData.currency}
                              onChange={(e) => handleInputChange('currency', e.target.value)}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="$">$</option>
                              <option value="₱">₱</option>
                            </select>
                            <input
                              type="number"
                              value={formData.cost}
                              onChange={(e) => handleInputChange('cost', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0.00"
                              step="0.01"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                          <input
                            type="date"
                            value={formData.purchaseDate}
                            onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date *</label>
                          <input
                            type="date"
                            value={formData.renewalDate}
                            onChange={(e) => handleInputChange('renewalDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Mode of Payment</label>
                          <select
                            value={formData.modeOfPayment}
                            onChange={(e) => handleInputChange('modeOfPayment', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Credit Card">Credit Card</option>
                            <option value="Cash">Cash</option>
                            <option value="Deposit">Deposit</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Note</label>
                          <input
                            type="text"
                            value={formData.modeOfPaymentNote}
                            onChange={(e) => handleInputChange('modeOfPaymentNote', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Additional payment details"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            placeholder="Additional notes or comments"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Device Information Section - Common for both License and Subscription */}
                {assets && assets.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                      Device Information
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {/* Link to IT Asset - User selects from dropdown */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Link to IT Asset
                        </label>
                        <select
                          value={formData.deviceId}
                          onChange={(e) => handleInputChange('deviceId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">No Asset Linked</option>
                          {assets.map(asset => (
                            <option key={asset._id} value={asset._id}>
                              {asset.deviceCode} - {asset.name} ({asset.brand} {asset.model})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Link this license/subscription to an existing IT asset
                        </p>
                      </div>

                      {/* Auto-filled Asset/Tag Number - Read-only field */}
                      {formData.deviceId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Asset / Tag Number
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={assets.find(a => a._id === formData.deviceId)?.deviceCode || ''}
                              disabled
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-mono font-semibold cursor-not-allowed"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            🔒 Auto-filled from selected device (read-only)
                          </p>
                        </div>
                      )}
                      
                      {/* Asset Linked Info - Only show when asset is selected */}
                      {formData.deviceId && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <Smartphone className="w-5 h-5 text-blue-600 flex shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900">Asset Linked</p>
                            <p className="text-xs text-blue-700">
                              {assets.find(a => a._id === formData.deviceId)?.deviceCode} - {assets.find(a => a._id === formData.deviceId)?.name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                {editingSubscription ? (
                  <>Reference Code: <span className="font-mono font-semibold">{editingSubscription.referenceCode}</span></>
                ) : (
                  <>Reference Code will be auto-generated: <span className="font-mono font-semibold">
                    IT-{formData.type === 'License' ? 'LIC' : 'SUB'}-####
                  </span></>
                )}
              </div>
              <div className="flex gap-3">
                {!editingSubscription && (
                  <button
                    type="button"
                    onClick={() => setShowAssetForm(true)}
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Asset Form
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSubscription(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={editingSubscription ? handleEditSubscriptionSubmit : handleAddSubscription}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={!formData.provider || !formData.renewalDate || !formData.cost}
                >
                  {editingSubscription ? 'Save Changes' : `Add ${formData.type}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Record Form Modal */}
      {showAssetForm && assetCategories && onAddCategory && onDeleteCategory && defaultCategories && onSaveFormRecord && currentUser && (
        <AssetRecordForm
          formRecord={(() => {
            const linkedNote = `Linked to ${formData.type}: ${formData.provider}${formData.subscriptionName ? ` - ${formData.subscriptionName}` : ''}`;

            // If deviceId is selected, pre-fill from the linked asset
            if (formData.deviceId && assets) {
              const linked = assets.find(a => a._id === formData.deviceId);
              if (linked) {
                return {
                  id: linked._id ?? '',
                  formType: 'Inventory Management' as FormRecord['formType'],
                  status: 'Active' as FormRecord['status'],
                  dateCreated: new Date().toISOString(),
                  createdBy: currentUser,
                  formData: {
                    deviceCode: linked.deviceCode,
                    assignedTo: formData.employeeName || linked.assignedTo || '',
                    position: linked.position || '',
                    company: formData.company,
                    location: formData.branch || linked.location,
                    department: formData.department || linked.department || '',
                    name: linked.name,
                    brand: linked.brand,
                    category: linked.category,
                    model: linked.model,
                    serialNumber: linked.serialNumber,
                    specifications: linked.specifications || '',
                    status: linked.status,
                    purchaseDate: linked.purchaseDate,
                    warrantyExpiry: linked.warrantyExpiry || '',
                    notes: `${linkedNote}${linked.notes ? `\n\n${linked.notes}` : ''}`,
                  },
                };
              }
            }

            // No deviceId — blank form pre-filled with subscription data
            return {
              id: '',
              formType: 'Inventory Management' as FormRecord['formType'],
              status: 'Active' as FormRecord['status'],
              dateCreated: new Date().toISOString(),
              createdBy: currentUser,
              formData: {
                deviceCode: '',
                assignedTo: formData.employeeName || '',
                position: '',
                company: formData.company,
                location: formData.branch || '',
                department: formData.department || '',
                name: '',
                brand: '',
                category: '',
                model: '',
                serialNumber: '',
                specifications: '',
                status: 'active',
                purchaseDate: formData.purchaseDate || '',
                warrantyExpiry: '',
                notes: linkedNote,
              },
            };
          })()}
          categories={assetCategories}
          onAddCategory={onAddCategory}
          onDeleteCategory={onDeleteCategory}
          defaultCategories={defaultCategories}
          onSave={(record) => {
            if (onSaveFormRecord) {
              onSaveFormRecord(record);
            }
            setShowAssetForm(false);
          }}
          onCancel={() => setShowAssetForm(false)}
          currentUser={currentUser}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingSubscription && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete {deletingSubscription.type}?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deletingSubscription.name}</strong> ({deletingSubscription.referenceCode})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingSubscription(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubscription}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}