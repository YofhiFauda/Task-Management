import React from 'react';
import { Task, Category, Status, ColumnDefinition } from '../types';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';

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
}

export default function TaskGrid({ tasks, categories, statuses, columns, onTaskClick, onReorder }: TaskGridProps) {
  const getCategory = (id?: string) => categories.find(c => c.id === id);
  const getStatus = (id: string) => statuses.find(s => s.id === id);

  // Sort tasks by order
  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;

    const taskToMove = sortedTasks[sourceIndex];
    // Simple reordering logic: move to the new position and update order
    // In a real app, you might want more sophisticated logic (e.g. fractional indexing)
    // Here we'll just pass the new index + 1 as the new order
    onReorder(taskToMove.id, destIndex + 1);
  };

  return (
    <div className="flex-1 overflow-auto">
      <DragDropContext onDragEnd={handleDragEnd}>
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">ID</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">Title</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Category</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Priority</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Date</th>
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
                    <td colSpan={8 + columns.length} className="px-6 py-12 text-center text-gray-500 italic">
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
                              snapshot.isDragging && "bg-white shadow-lg ring-1 ring-indigo-200 z-20"
                            )}
                          >
                            <td className="px-4 py-3" {...provided.dragHandleProps}>
                              <GripVertical className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-400">
                              #{task.id.slice(-4).toUpperCase()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                                {task.title}
                              </div>
                              {task.description && (
                                <div 
                                  className="text-xs text-gray-500 truncate max-w-[300px]"
                                  dangerouslySetInnerHTML={{ __html: task.description.replace(/<[^>]*>?/gm, '').slice(0, 60) + '...' }}
                                />
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
