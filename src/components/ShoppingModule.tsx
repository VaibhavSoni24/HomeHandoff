import React, { useState } from 'react';
import { 
  ShoppingCart, 
  CheckCircle2, 
  Plus, 
  Sparkles, 
  Layers, 
  ShoppingBag
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

  const completedCount = items.filter(i => i.completed).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  // Group items by category
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
    if (!newName.trim()) return;

    onAddItem({
      name: newName,
      category: newCategory,
      quantity: newQuantity || '1',
      completed: false,
      aisle: newAisle || `Aisle - ${newCategory}`,
      priority: 'essential'
    });

    setShowAddModal(false);
    setNewName('');
    setNewAisle('');
  };

  return (
    <div className="module-container glass-panel">
      {/* Header bar */}
      <div className="module-header">
        <div className="module-title-group">
          <div className="module-icon-wrap amber">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h2 className="module-title">Household Shopping & Grocery List</h2>
            <div className="sync-badge-row">
              <span className="badge badge-amber">
                <Sparkles size={11} /> Simulated Alexa Shopping List API
              </span>
              {activePlanTitle && (
                <span className="badge badge-cyan">
                  <Layers size={11} /> {activePlanTitle}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="module-actions">
          <button className="primary-add-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Progress & Category Filter */}
      <div className="tasks-sub-ribbon">
        <div className="tasks-progress-indicator">
          <span className="progress-text">
            List Status: <strong>{progressPercent}% Purchased</strong> ({completedCount}/{items.length} items)
          </span>
          <div className="ribbon-progress-track">
            <div className="ribbon-progress-bar amber-bar" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="assignee-filter-row">
          <span className="assignee-label">Aisle:</span>
          {['all', ...categories].map(cat => (
            <button
              key={cat}
              className={`person-filter-btn ${filterCategory === cat ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="shopping-items-grid">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <div 
              key={item.id} 
              className={`shopping-card ${item.completed ? 'item-purchased' : ''} ${item.planId ? 'plan-item-highlight' : ''}`}
            >
              <button 
                className={`item-toggle-btn ${item.completed ? 'checked' : ''}`}
                onClick={() => onToggleItem(item.id)}
                title={item.completed ? 'Mark unpurchased' : 'Mark purchased'}
              >
                {item.completed ? (
                  <CheckCircle2 size={20} className="check-icon-active text-amber" />
                ) : (
                  <div className="check-box-empty"></div>
                )}
              </button>

              <div className="item-details">
                <div className="item-name-row">
                  <span className={`item-name-text ${item.completed ? 'line-through' : ''}`}>
                    {item.name}
                  </span>
                  <span className="item-qty-badge">{item.quantity}</span>
                </div>

                <div className="item-sub-row">
                  <span className="item-category-tag">{item.category}</span>
                  {item.aisle && (
                    <span className="item-aisle-tag">📍 {item.aisle}</span>
                  )}
                  {item.planId && (
                    <span className="item-plan-badge" title="Added specifically for guest visit">
                      <Sparkles size={10} /> Visit Prep
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-module-state">
            <ShoppingBag size={36} className="text-muted" />
            <p>No shopping items found in this section.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card glass-panel-elevated" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Shopping / Grocery Item</h3>
            <form onSubmit={handleCreateItem} className="modal-form">
              <div className="form-group">
                <label>Item Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Sourdough bread, Ground coffee, Almond milk"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select 
                    value={newCategory} 
                    onChange={e => setNewCategory(e.target.value as ShoppingCategory)}
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 1 loaf, 2 gallons, 1 bag"
                    value={newQuantity}
                    onChange={e => setNewQuantity(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Store Aisle / Department (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Aisle 2 - Bakery"
                  value={newAisle}
                  onChange={e => setNewAisle(e.target.value)}
                />
              </div>

              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-confirm">Add to List</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
