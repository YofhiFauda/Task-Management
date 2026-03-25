import React, { useState } from 'react';
import { Task, Category, Status, ColumnDefinition } from '../types';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Trash2, CheckCircle, Users, X, MessageSquare, ChevronDown, ChevronUp, Pin, PinOff, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface TaskGridProps {
  tasks: Task[];
  categories: Category[];
  statuses: Status[];
  columns: ColumnDefinition[];
  onTaskClick: (task: Task) => void;
  onReorder: (taskId: string, newOrder: number) => void;
  onBulkDelete: (taskIds: string[]) => void;
  onBulkStatusUpdate: (taskIds: string[], statusId: string) => void;
  onTogglePin: (taskId: string, isPinned: boolean) => void;
}

export default function TaskGrid({ 
  tasks, 
  categories, 
  statuses, 
  columns, 
  onTaskClick, 
  onReorder,
  onBulkDelete,
  onBulkStatusUpdate,
  onTogglePin
}: TaskGridProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: 'status' | 'category' | 'priority' | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const getCategory = (id?: string) => categories.find(c => c.id === id);
  const getStatus = (id: string) => statuses.find(s => s.id === id);

  const toggleSelectAll = () => {
    if (selectedIds.length === tasks.length) setSelectedIds([]);
    else setSelectedIds(tasks.map(t => t.id));
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleSort = (key: 'status' | 'category' | 'priority' | 'default') => {
    if (key === 'default') {
      setSortConfig({ key: null, direction: 'asc' });
      return;
    }

    if (sortConfig.key === key) {
      setSortConfig({ key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };

  // Sort tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    // Pinned tasks always at the top
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    if (sortConfig.key) {
      let comparison = 0;
      if (sortConfig.key === 'status') {
        const statusA = getStatus(a.statusId)?.name || '';
        const statusB = getStatus(b.statusId)?.name || '';
        comparison = statusA.localeCompare(statusB);
      } else if (sortConfig.key === 'category') {
        const catA = getCategory(a.categoryId)?.name || '';
        const catB = getCategory(b.categoryId)?.name || '';
        comparison = catA.localeCompare(catB);
      } else if (sortConfig.key === 'priority') {
        const orderA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const orderB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        comparison = orderA - orderB;
      }

      if (comparison !== 0) {
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
    }

    // Default or fallback to order
    return a.order - b.order;
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;

    const taskToMove = sortedTasks[sourceIndex];
    const destinationTask = sortedTasks[destIndex];

    // If moving across pinned/unpinned boundary, we should update the pinned status
    const willBePinned = destinationTask.isPinned;
    
    // Calculate new order
    let newOrder: number;
    if (destIndex === 0) {
      newOrder = sortedTasks[0].order - 1000;
    } else if (destIndex === sortedTasks.length - 1) {
      newOrder = sortedTasks[sortedTasks.length - 1].order + 1000;
    } else {
      // Find the neighbors in the new position
      const prevTask = sourceIndex < destIndex ? sortedTasks[destIndex] : sortedTasks[destIndex - 1];
      const nextTask = sourceIndex < destIndex ? sortedTasks[destIndex + 1] : sortedTasks[destIndex];
      
      if (prevTask && nextTask) {
        newOrder = (prevTask.order + nextTask.order) / 2;
      } else {
        newOrder = destinationTask.order + (sourceIndex < destIndex ? 500 : -500);
      }
    }

    // If we are moving between pinned/unpinned, we need to handle that
    // For simplicity, let's just update the pinned status if it's different
    if (!!taskToMove.isPinned !== !!willBePinned) {
      onTogglePin(taskToMove.id, !!willBePinned);
    }

    onReorder(taskToMove.id, newOrder);
  };

  return (
    <div className="flex-1 overflow-auto relative">
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-md"
          >
            <div className="flex items-center gap-3 pr-6 border-r border-white/10">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold">
                {selectedIds.length}
              </div>
              <span className="text-sm font-medium">Tasks Selected</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl transition-all text-sm font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  Update Status
                </button>
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                  {statuses.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onBulkStatusUpdate(selectedIds, s.id);
                        setSelectedIds([]);
                      }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => {
                  if (window.confirm(`Delete ${selectedIds.length} tasks?`)) {
                    onBulkDelete(selectedIds);
                    setSelectedIds([]);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/20 text-red-400 rounded-xl transition-all text-sm font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>

            <button 
              onClick={() => setSelectedIds([])}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <DragDropContext onDragEnd={handleDragEnd}>
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 w-10">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === tasks.length && tasks.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">ID</th>
              <th 
                className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px] cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => handleSort('default')}
              >
                Title
              </th>
              <th 
                className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32 cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  {sortConfig.key === 'status' && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32 cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-1">
                  Category
                  {sortConfig.key === 'category' && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center gap-1">
                  Priority
                  {sortConfig.key === 'priority' && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Due Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Assignee</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Created By</th>
              {columns.map(col => (
                <th key={col.id} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <Droppable droppableId="tasks-table">
            {(provided) => (
              <tbody 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="divide-y divide-gray-100"
              >
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9 + columns.length} className="px-6 py-12 text-center text-gray-500 italic">
                      No tasks found for this period.
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((task, idx) => {
                    const status = getStatus(task.statusId);
                    const category = getCategory(task.categoryId);

                    return (
                      <Draggable key={task.id} draggableId={task.id} index={idx}>
                        {(provided, snapshot) => (
                          <tr 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            onClick={() => onTaskClick(task)}
                            className={cn(
                              "hover:bg-gray-50 cursor-pointer transition-colors group",
                              snapshot.isDragging && "bg-white shadow-lg ring-1 ring-indigo-200 z-20",
                              selectedIds.includes(task.id) && "bg-indigo-50/50"
                            )}
                          >
                            <td className="px-4 py-3" onClick={(e) => toggleSelect(e, task.id)}>
                              <input 
                                type="checkbox" 
                                checked={selectedIds.includes(task.id)}
                                readOnly
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3" {...provided.dragHandleProps}>
                              <GripVertical className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTogglePin(task.id, !task.isPinned);
                                }}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all",
                                  task.isPinned 
                                    ? "bg-amber-100 text-amber-600 hover:bg-amber-200" 
                                    : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                                )}
                                title={task.isPinned ? "Unpin task" : "Pin task to top"}
                              >
                                {task.isPinned ? <Pin className="w-4 h-4 fill-current" /> : <Pin className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-400">
                              #{task.id.slice(-4).toUpperCase()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                                  {task.title}
                                </div>
                                {task.commentCount !== undefined && task.commentCount > 0 && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold border border-indigo-100">
                                    <MessageSquare className="w-2.5 h-2.5" />
                                    {task.commentCount}
                                  </div>
                                )}
                              </div>
                              {task.description && (
                                <div className="mt-1">
                                  <div 
                                    className={cn(
                                      "text-xs text-gray-500 max-w-[400px] transition-all duration-200 prose prose-sm prose-indigo",
                                      !expandedIds.includes(task.id) && "truncate"
                                    )}
                                  >
                                    <ReactMarkdown>
                                      {expandedIds.includes(task.id) 
                                        ? task.description 
                                        : task.description.slice(0, 60) + (task.description.length > 60 ? '...' : '')}
                                    </ReactMarkdown>
                                  </div>
                                  {task.description.length > 60 && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedIds(prev => 
                                          prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id]
                                        );
                                      }}
                                      className="flex items-center gap-0.5 text-[10px] text-indigo-600 font-bold hover:text-indigo-700 transition-colors mt-1"
                                    >
                                      {expandedIds.includes(task.id) ? (
                                        <>
                                          <ChevronUp className="w-3 h-3" />
                                          Show Less
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="w-3 h-3" />
                                          Show More
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span 
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                style={{ 
                                  backgroundColor: status?.color ? `${status.color}20` : '#f3f4f6',
                                  color: status?.color || '#374151'
                                }}
                              >
                                {status?.name || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {category ? (
                                <span 
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                                  style={{ 
                                    borderColor: category.color,
                                    color: category.color
                                  }}
                                >
                                  {category.name}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "text-xs font-semibold",
                                task.priority === 'Urgent' ? "text-red-600" :
                                task.priority === 'High' ? "text-orange-600" :
                                task.priority === 'Medium' ? "text-blue-600" : "text-gray-500"
                              )}>
                                {task.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {task.date ? format(new Date(task.date), 'MMM d, yyyy') : '-'}
                            </td>
                            <td className="px-4 py-3">
                              {task.assigneeId ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <Users className="w-3 h-3 text-indigo-600" />
                                  </div>
                                  <span className="text-sm text-gray-900">{task.assigneeName}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Unassigned</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">{task.creatorName}</div>
                              <div className="text-[10px] text-gray-400 uppercase tracking-tighter">
                                {task.createdAt && typeof task.createdAt.toDate === 'function' ? format(task.createdAt.toDate(), 'HH:mm') : ''}
                              </div>
                            </td>
                            {columns.map(col => (
                              <td key={col.id} className="px-4 py-3 text-sm text-gray-600">
                                {task.customFields?.[col.id] !== undefined ? (
                                  col.type === 'boolean' ? (
                                    task.customFields[col.id] ? 'Yes' : 'No'
                                  ) : col.type === 'date' ? (
                                    format(new Date(task.customFields[col.id]), 'MMM d, yyyy')
                                  ) : (
                                    task.customFields[col.id]
                                  )
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        )}
                      </Draggable>
                    );
                  })
                )}
                {provided.placeholder}
              </tbody>
            )}
          </Droppable>
        </table>
      </DragDropContext>
    </div>
  );
}
