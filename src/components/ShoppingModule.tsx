import React, { useState } from 'react';
import { 
  Plus, 
  ShoppingBag,
  AlertCircle
} from 'lucide-react';
import type { ShoppingItem, ShoppingCategory } from '../types/household';

interface ShoppingModuleProps {
  items: ShoppingItem[];
  activePlanTitle?: string;
  onToggleItem: (itemId: string) => void;
  onAddItem: (item: Omit<ShoppingItem, 'id'>) => void;
}

export const ShoppingModule: React.FC<ShoppingModuleProps> = ({
  items,
  activePlanTitle,
  onToggleItem,
  onAddItem
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Add item form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ShoppingCategory>('Produce');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newAisle, setNewAisle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const completedCount = items.filter(i => i.completed).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const categories: ShoppingCategory[] = [
    'Produce',
    'Bakery',
    'Dairy & Refrigerated',
    'Beverages',
    'Guest Amenities',
    'Pantry'
  ];

  const filteredItems = items.filter(item => {
    if (filterCategory === 'all') return true;
    return item.category === filterCategory;
  });

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = newName.trim();
    if (!name) {
      setFormError('Please enter an item name.');
      return;
    }

    onAddItem({
      name,
      category: newCategory,
      quantity: newQuantity.trim() || '1',
      completed: false,
      aisle: newAisle.trim() || `Aisle - ${newCategory}`,
      priority: 'essential'
    });

    setShowAddModal(false);
    setNewName('');
    setNewAisle('');
    setFormError(null);
  };

  return (
    <div className="module-panel surface-card">
      {/* Header bar */}
      <div className="module-header-row">
        <div>
          <h2 className="module-heading">Shopping List & Supplies</h2>
          <p className="module-subheading">
            {activePlanTitle 
              ? `Synchronized with active plan: "${activePlanTitle}" (Simulated Alexa Shopping List API)` 
              : 'Household groceries and guest hospitality amenities'}
          </p>
        </div>

        <div className="module-header-actions">
          <button 
            type="button" 
            className="btn-primary" 
            onClick={() => { setFormError(null); setShowAddModal(true); }}
          >
            <Plus size={15} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Progress & Category Filter */}
      <div className="tasks-controls-bar">
        <div className="tasks-progress-inline">
          <span className="tasks-progress-count">
            <strong>{completedCount} of {items.length}</strong> items purchased ({progressPercent}%)
          </span>
          <div className="tasks-progress-track">
            <div className="tasks-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="assignee-filter-group">
          <span className="filter-label">Category:</span>
          {['all', ...categories].map(cat => (
            <button
              key={cat}
              type="button"
              className={`btn-filter-sm ${filterCategory === cat ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat === 'all' ? 'All Aisles' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="compact-shopping-list">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => {
            const isPlanItem = !!item.planId;
            return (
              <div 
                key={item.id} 
                className={`shopping-item-row ${item.completed ? 'shopping-row-completed' : ''}`}
              >
                <label className="shopping-checkbox-container">
                  <input
                    type="checkbox"
                    className="task-checkbox-input"
                    checked={item.completed}
                    onChange={() => onToggleItem(item.id)}
                    aria-label={`Mark as ${item.completed ? 'unpurchased' : 'purchased'}: ${item.name}`}
                  />
                  <div className="shopping-content-block">
                    <div className="shopping-primary-line">
                      <span className={`shopping-item-name ${item.completed ? 'completed-text' : ''}`}>
                        {item.name}
                      </span>
                      <span className="shopping-qty-badge">{item.quantity}</span>
                      {isPlanItem && (
                        <span className="badge badge-accent">Plan Item</span>
                      )}
                    </div>

                    <div className="shopping-meta-line">
                      <span className="shopping-category-tag">{item.category}</span>
                      {item.aisle && (
                        <span className="shopping-aisle-text">• {item.aisle}</span>
                      )}
                    </div>
                  </div>
                </label>
              </div>
            );
          })
        ) : (
          <div className="empty-state-card">
            <ShoppingBag size={24} className="text-muted" />
            <p>No shopping items found matching the selected category.</p>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog surface-card" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="add-item-title">
            <div className="modal-header">
              <h3 id="add-item-title" className="modal-title">Add Shopping Item</h3>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowAddModal(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="modal-form">
              {formError && (
                <div className="form-error-banner" role="alert">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="shop-name" className="form-label">Item Name *</label>
                <input
                  id="shop-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g., Sparkling water, Organic avocados"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="shop-qty" className="form-label">Quantity</label>
                  <input
                    id="shop-qty"
                    type="text"
                    className="form-input"
                    placeholder="e.g., 2 bottles, 1 pack"
                    value={newQuantity}
                    onChange={e => setNewQuantity(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="shop-cat" className="form-label">Department / Aisle</label>
                  <select
                    id="shop-cat"
                    className="form-select"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as ShoppingCategory)}
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="shop-aisle" className="form-label">Store Aisle Note (Optional)</label>
                <input
                  id="shop-aisle"
                  type="text"
                  className="form-input"
                  placeholder="e.g., Aisle 4 - Drinks"
                  value={newAisle}
                  onChange={e => setNewAisle(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add to List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
