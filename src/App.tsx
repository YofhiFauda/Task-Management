/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  OperationType,
  handleFirestoreError,
  writeBatch
} from './firebase';
import { Task, Category, Status, ColumnDefinition, Project } from './types';
import { format, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { 
  LayoutGrid, 
  Plus, 
  Settings as SettingsIcon, 
  History, 
  Search, 
  Filter, 
  LogOut, 
  LogIn,
  ChevronRight,
  ChevronDown,
  Table as TableIcon,
  Bell,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Notification } from './types';

// Helper for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components (to be implemented in separate files or below)
import TaskGrid from './components/TaskGrid';
import TaskModal from './components/TaskModal';
import SettingsModal from './components/SettingsModal';
import HistoryView from './components/HistoryView';
import CheatSheetView from './components/CheatSheetView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [view, setView] = useState<'current' | 'history' | 'cheatsheet'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | 'all'>('all');
  const [activeProjectId, setActiveProjectId] = useState<string | 'all'>('all');

  const currentMonthKey = format(new Date(), 'yyyy-MM');

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        // Save user profile to Firestore
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error('Error saving user profile:', error);
        }
      }
    });
    return unsubscribe;
  }, []);

  // Data listeners
  useEffect(() => {
    if (!user) return;

    const unsubTasks = onSnapshot(
      query(collection(db, 'tasks'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const taskData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(taskData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'tasks')
    );

    const unsubCats = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'categories')
    );

    const unsubStats = onSnapshot(
      query(collection(db, 'statuses'), orderBy('order', 'asc')),
      (snapshot) => {
        setStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Status)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'statuses')
    );

    const unsubCols = onSnapshot(
      query(collection(db, 'columns'), orderBy('order', 'asc')),
      (snapshot) => {
        setColumns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ColumnDefinition)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'columns')
    );

    const unsubNotifications = onSnapshot(
      query(
        collection(db, 'notifications'), 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')
    );

    const unsubProjects = onSnapshot(
      query(
        collection(db, 'projects'), 
        where('userId', '==', user.uid),  // ✅ FIXED: Added userId filter
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'projects')
    );

    return () => {
      unsubTasks();
      unsubCats();
      unsubStats();
      unsubCols();
      unsubNotifications();
      unsubProjects();
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesMonth = view === 'current' ? task.monthKey === currentMonthKey : task.monthKey !== currentMonthKey;
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.statusId === filterStatus;
      const matchesProject = activeProjectId === 'all' || task.projectId === activeProjectId;
      return matchesMonth && matchesSearch && matchesStatus && matchesProject;
    });
  }, [tasks, view, searchQuery, filterStatus, activeProjectId, currentMonthKey]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100"
        >
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LayoutGrid className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TaskGrid</h1>
          <p className="text-gray-500 mb-8">Excel-inspired task management for high-performance teams.</p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-200"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <TableIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">TaskGrid</h1>
          
          <nav className="ml-8 flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setView('current')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                view === 'current' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Current Tasks
            </button>
            <button
              onClick={() => setView('history')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                view === 'history' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              History
            </button>
            <button
              onClick={() => setView('cheatsheet')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                view === 'cheatsheet' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Cheat Sheet
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-xl text-sm w-64 transition-all"
            />
          </div>
          
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsNotificationsOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                        {unreadCount} Unread
                      </span>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-400 text-sm">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id}
                            className={cn(
                              "px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group relative",
                              !n.read && "bg-indigo-50/30"
                            )}
                            onClick={() => markAsRead(n.id)}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-bold text-gray-900">{n.title}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(n.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                              >
                                <Plus className="w-3 h-3 text-gray-400 hover:text-red-500 rotate-45" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2 mb-1">{n.message}</p>
                            <span className="text-[10px] text-gray-400">
                              {n.createdAt && typeof n.createdAt.toDate === 'function' ? format(n.createdAt.toDate(), 'MMM d, HH:mm') : ''}
                            </span>
                            {!n.read && (
                              <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-full" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>

          <div className="h-8 w-px bg-gray-200 mx-2" />

          <div className="flex items-center gap-3">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              alt={user.displayName || ''} 
              className="w-8 h-8 rounded-full border border-gray-200"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {view === 'current' ? `Tasks for ${format(new Date(), 'MMMM yyyy')}` : 'Task Archives'}
            </h2>
            <p className="text-gray-500 text-sm">
              {filteredTasks.length} tasks found
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">All Statuses</option>
              {statuses.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {view === 'current' && (
              <button
                onClick={() => {
                  setSelectedTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-100"
              >
                <Plus className="w-4 h-4" />
                New Task
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          {view === 'current' ? (
            <TaskGrid 
              tasks={filteredTasks} 
              categories={categories} 
              statuses={statuses} 
              columns={columns}
              onTaskClick={(task) => {
                setSelectedTask(task);
                setIsTaskModalOpen(true);
              }}
              onReorder={async (taskId, newOrder) => {
                try {
                  await updateDoc(doc(db, 'tasks', taskId), { order: newOrder });
                } catch (error) {
                  handleFirestoreError(error, OperationType.UPDATE, 'tasks');
                }
              }}
              onBulkDelete={async (taskIds) => {
                try {
                  const batch = writeBatch(db);
                  taskIds.forEach(id => {
                    batch.delete(doc(db, 'tasks', id));
                  });
                  await batch.commit();
                } catch (error) {
                  handleFirestoreError(error, OperationType.DELETE, 'tasks');
                }
              }}
              onBulkStatusUpdate={async (taskIds, statusId) => {
                try {
                  const batch = writeBatch(db);
                  taskIds.forEach(id => {
                    batch.update(doc(db, 'tasks', id), { statusId });
                  });
                  await batch.commit();
                } catch (error) {
                  handleFirestoreError(error, OperationType.UPDATE, 'tasks');
                }
              }}
              onTogglePin={async (taskId, isPinned) => {
                try {
                  await updateDoc(doc(db, 'tasks', taskId), { isPinned });
                } catch (error) {
                  handleFirestoreError(error, OperationType.UPDATE, 'tasks');
                }
              }}
            />
          ) : view === 'history' ? (
            <HistoryView 
              projects={projects}
              tasks={tasks}
              onCreateProject={async (name, description) => {
                if (!user) return;
                try {
                  await addDoc(collection(db, 'projects'), {
                    name,
                    description,
                    userId: user.uid,  // ✅ FIXED: Changed from createdBy to userId
                    createdAt: serverTimestamp(),
                  });
                } catch (error) {
                  handleFirestoreError(error, OperationType.CREATE, 'projects');
                }
              }}
              onOpenProject={(projectId) => {
                setActiveProjectId(projectId);
                setView('current');
              }}
            />
          ) : (
            <CheatSheetView user={user} />
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <TaskModal
            user={user}
            task={selectedTask}
            categories={categories}
            statuses={statuses}
            columns={columns}
            onClose={() => setIsTaskModalOpen(false)}
            maxOrder={tasks.length > 0 ? Math.max(...tasks.map(t => t.order)) : 0}
            minOrder={tasks.length > 0 ? Math.min(...tasks.map(t => t.order)) : 0}
            projects={projects}
            activeProjectId={activeProjectId}
          />
        )}
        {isSettingsModalOpen && (
          <SettingsModal
            categories={categories}
            statuses={statuses}
            columns={columns}
            onClose={() => setIsSettingsModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
