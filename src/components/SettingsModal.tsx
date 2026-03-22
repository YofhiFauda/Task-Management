import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Columns, 
  Tag, 
  CheckCircle, 
  GripVertical,
  Palette,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  OperationType,
  handleFirestoreError
} from '../firebase';
import { Category, Status, ColumnDefinition } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SettingsModalProps {
  categories: Category[];
  statuses: Status[];
  columns: ColumnDefinition[];
  onClose: () => void;
}

export default function SettingsModal({ categories, statuses, columns, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'statuses' | 'categories' | 'columns'>('statuses');
  
  // Local state for new items
  const [newItemName, setNewItemName] = useState('');
  const [newItemColor, setNewItemColor] = useState('#6366f1');
  const [newItemType, setNewItemType] = useState<ColumnDefinition['type']>('text');

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;

    try {
      if (activeTab === 'statuses') {
        const newDocRef = doc(collection(db, 'statuses'));
        await setDoc(newDocRef, {
          name: newItemName,
          color: newItemColor,
          order: statuses.length
        });
      } else if (activeTab === 'categories') {
        const newDocRef = doc(collection(db, 'categories'));
        await setDoc(newDocRef, {
          name: newItemName,
          color: newItemColor,
          order: categories.length
        });
      } else if (activeTab === 'columns') {
        const newDocRef = doc(collection(db, 'columns'));
        await setDoc(newDocRef, {
          name: newItemName,
          type: newItemType,
          order: columns.length
        });
      }
      setNewItemName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, activeTab);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Are you sure? This may affect existing tasks.')) return;
    try {
      await deleteDoc(doc(db, activeTab, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, activeTab);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    let items: (Status | Category | ColumnDefinition)[] = [];
    if (activeTab === 'statuses') items = [...statuses];
    else if (activeTab === 'categories') items = [...categories];
    else items = [...columns];

    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update orders in Firestore
    try {
      await Promise.all(items.map((item, index) => 
        updateDoc(doc(db, activeTab, item.id), { order: index })
      ));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, activeTab);
    }
  };

  const currentItems = (activeTab === 'statuses' ? statuses : activeTab === 'categories' ? categories : columns)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <LayoutGrid className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">System Settings</h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Customize your workspace</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-8 border-b border-gray-100 flex gap-8">
          {[
            { id: 'statuses', label: 'Statuses', icon: CheckCircle },
            { id: 'categories', label: 'Categories', icon: Tag },
            { id: 'columns', label: 'Dynamic Columns', icon: Columns }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "py-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all",
                activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Add New Item Form */}
          <div className="mb-10 p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Add New {activeTab.slice(0, -1)}</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={`Enter ${activeTab.slice(0, -1)} name...`}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:border-indigo-500 rounded-xl outline-none transition-all text-sm"
                />
              </div>

              {activeTab !== 'columns' ? (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Color</label>
                  <div className="flex items-center gap-2 bg-white p-1.5 border border-gray-200 rounded-xl">
                    <input
                      type="color"
                      value={newItemColor}
                      onChange={(e) => setNewItemColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-none p-0 overflow-hidden"
                    />
                    <span className="text-xs font-mono text-gray-500 uppercase pr-2">{newItemColor}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Type</label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as any)}
                    className="px-4 py-2.5 bg-white border border-gray-200 focus:border-indigo-500 rounded-xl outline-none transition-all text-sm"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                  </select>
                </div>
              )}

              <button
                onClick={handleAddItem}
                disabled={!newItemName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-indigo-100"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List of Items */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Existing {activeTab}</h3>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="settings-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {currentItems.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all group",
                              snapshot.isDragging && "shadow-xl ring-2 ring-indigo-100 z-50 border-indigo-200"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded-lg">
                                <GripVertical className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                              </div>
                              {'color' in item ? (
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                              ) : (
                                <div className="bg-gray-100 p-2 rounded-lg">
                                  <Columns className="w-4 h-4 text-gray-500" />
                                </div>
                              )}
                              <div>
                                <span className="text-sm font-semibold text-gray-700 block">{item.name}</span>
                                {'type' in item && <span className="text-[10px] text-gray-400 uppercase font-bold">{item.type}</span>}
                              </div>
                            </div>
                            <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 flex justify-end bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
