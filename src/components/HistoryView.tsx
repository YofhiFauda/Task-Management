import React from 'react';
import { Task, Category, Status } from '../types';
import { format, parse } from 'date-fns';
import { Calendar, ChevronRight } from 'lucide-react';

interface HistoryViewProps {
  tasks: Task[];
  categories: Category[];
  statuses: Status[];
  onTaskClick: (task: Task) => void;
}

export default function HistoryView({ tasks, categories, statuses, onTaskClick }: HistoryViewProps) {
  // Group tasks by monthKey
  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.monthKey]) acc[task.monthKey] = [];
    acc[task.monthKey].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Sort monthKeys descending
  const sortedMonthKeys = Object.keys(groupedTasks).sort((a, b) => b.localeCompare(a));

  const getStatus = (id: string) => statuses.find(s => s.id === id);

  return (
    <div className="flex-1 overflow-auto p-8 bg-gray-50/50">
      <div className="max-w-4xl mx-auto space-y-12">
        {sortedMonthKeys.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-400 italic">No archived tasks found.</p>
          </div>
        ) : (
          sortedMonthKeys.map(monthKey => {
            const date = parse(monthKey, 'yyyy-MM', new Date());
            const monthTasks = groupedTasks[monthKey];

            return (
              <div key={monthKey} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    {format(date, 'MMMM yyyy')}
                  </h3>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {monthTasks.length} Tasks
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {monthTasks.map(task => {
                    const status = getStatus(task.statusId);
                    return (
                      <div 
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {task.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {task.description ? task.description.replace(/[#*`]/g, '') : ''}
                            </p>
                          </div>
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter"
                            style={{ 
                              backgroundColor: status?.color ? `${status.color}15` : '#f3f4f6',
                              color: status?.color || '#374151'
                            }}
                          >
                            {status?.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-[8px] font-bold text-gray-400">
                                {task.creatorName.charAt(0)}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium">{task.creatorName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                            {task.date ? format(new Date(task.date), 'MMM d') : '-'}
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
