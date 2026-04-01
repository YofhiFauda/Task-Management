import React, { useMemo, useState } from 'react';
import { Project, Task } from '../types';
import { FolderKanban, Plus } from 'lucide-react';

interface HistoryViewProps {
  projects: Project[];
  tasks: Task[];
  onCreateProject: (name: string, description: string) => Promise<void>;
  onOpenProject: (projectId: string) => void;
}

export default function HistoryView({ projects, tasks, onCreateProject, onOpenProject }: HistoryViewProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const taskCountByProject = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (!task.projectId) return acc;
      acc[task.projectId] = (acc[task.projectId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tasks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreateProject(name.trim(), description.trim());
      setName('');
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-8 bg-gray-50/50">
      <div className="max-w-5xl mx-auto space-y-8">
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Create Task Project</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-2.5"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          </div>
        </form>

        {projects.length === 0 ? (
          <div className="text-center py-24 text-gray-400">No projects yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onOpenProject(project.id)}
                className="text-left bg-white p-5 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-gray-900">{project.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{project.description || 'No description'}</p>
                  </div>
                  <FolderKanban className="w-5 h-5 text-indigo-500" />
                </div>
                <p className="mt-4 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  {taskCountByProject[project.id] || 0} tasks
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
