import { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  defaultCategories: string[];
  required?: boolean;
  disabled?: boolean;
}

export function CategorySelector({
  value,
  onChange,
  categories,
  onAddCategory,
  onDeleteCategory,
  defaultCategories,
  required = false,
  disabled = false,
}: CategorySelectorProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    const categoryLower = newCategory.toLowerCase().trim();
    
    if (categories.some(cat => cat.toLowerCase() === categoryLower)) {
      setError('Category already exists');
      return;
    }

    onAddCategory(categoryLower);
    setNewCategory('');
    setError('');
    setShowAddModal(false);
  };

  const handleDeleteCategory = (category: string) => {
    if (value === category) {
      onChange(categories[0] || '');
    }
    onDeleteCategory(category);
  };

  const customCategories = categories;

  return (
    <div className="relative">
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
        
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
          title="Add Category"
        >
          <Plus className="w-4 h-4" />
        </button>

        {customCategories.length > 0 && (
          <button
            type="button"
            onClick={() => setShowManageModal(true)}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1"
            title="Manage Categories"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add New Category</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewCategory('');
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setError('');
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., projector, camera"
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewCategory('');
                  setError('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Manage Custom Categories</h3>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {customCategories.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No categories yet. Add one using the + button.
                </p>
              ) : (
                <div className="space-y-2">
                  {customCategories.map((category) => (
                    <div
                      key={category}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <span className="font-medium text-gray-900">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </span>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowManageModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}