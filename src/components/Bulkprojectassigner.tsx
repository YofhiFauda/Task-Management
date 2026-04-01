import React, { useState, useMemo } from 'react';
import { Task, Project } from '../types';
import { X, FolderKanban, AlertCircle, CheckCircle } from 'lucide-react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

interface BulkProjectAssignerProps {
  tasks: Task[];
  projects: Project[];
  onClose: () => void;
  onComplete: () => void;
}

export default function BulkProjectAssigner({ 
  tasks, 
  projects, 
  onClose,
  onComplete
}: BulkProjectAssignerProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [targetProjectId, setTargetProjectId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter tasks yang belum punya project
  const unassignedTasks = useMemo(() => {
    return tasks.filter(task => !task.projectId);
  }, [tasks]);

  const toggleTask = (taskId: string) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  const selectAll = () => {
    setSelectedTasks(unassignedTasks.map(t => t.id));
  };

  const deselectAll = () => {
    setSelectedTasks([]);
  };

  const handleAssign = async () => {
    if (!targetProjectId || selectedTasks.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      
      selectedTasks.forEach(taskId => {
        const taskRef = doc(db, 'tasks', taskId);
        batch.update(taskRef, { projectId: targetProjectId });
      });

      await batch.commit();
      
      alert(`✅ Berhasil assign ${selectedTasks.length} tasks ke project!`);
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error assigning tasks:', error);
      alert('❌ Gagal assign tasks. Cek console untuk detail.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk Assign Tasks to Project</h2>
            <p className="text-sm text-gray-500 mt-1">
              Assign tasks yang belum punya project ke project tertentu
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <AlertCircle className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Unassigned Tasks</span>
              </div>
              <div className="text-3xl font-bold text-orange-700">{unassignedTasks.length}</div>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <CheckCircle className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Selected</span>
              </div>
              <div className="text-3xl font-bold text-green-700">{selectedTasks.length}</div>
            </div>
          </div>

          {/* Target Project Selection */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <label className="block text-sm font-bold text-indigo-900 mb-2">
              Select Target Project
            </label>
            <select
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
            >
              <option value="">-- Select Project --</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  📁 {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Task List */}
          {unassignedTasks.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">
                🎉 Semua tasks sudah di-assign ke project!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Unassigned Tasks ({unassignedTasks.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAll}
                    className="text-xs font-bold text-gray-600 hover:text-gray-700 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {unassignedTasks.map(task => (
                  <label
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.id)}
                      onChange={() => toggleTask(task.id)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {task.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-mono text-gray-400">
                          #{task.id.slice(-4).toUpperCase()}
                        </span>
                        {task.categoryId && (
                          <span className="text-[10px] px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md">
                            {task.categoryId}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedTasks.length > 0 && targetProjectId ? (
              <span className="font-medium text-indigo-600">
                ✓ Ready to assign {selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-gray-400">
                Select tasks and target project to continue
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!targetProjectId || selectedTasks.length === 0 || isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              <FolderKanban className="w-4 h-4" />
              {isSubmitting ? 'Assigning...' : `Assign to Project`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
