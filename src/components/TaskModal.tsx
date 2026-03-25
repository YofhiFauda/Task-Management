import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  MessageSquare, 
  History as HistoryIcon, 
  User as UserIcon, 
  Clock, 
  Send,
  Plus,
  Minus,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  Quote,
  Pin,
  Copy
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  addDoc,
  OperationType,
  handleFirestoreError,
  getDocs,
  increment
} from '../firebase';
import { Task, Category, Status, ColumnDefinition, Log, Comment, UserProfile } from '../types';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// TipTap Imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TaskModalProps {
  user: any;
  task: Task | null;
  categories: Category[];
  statuses: Status[];
  columns: ColumnDefinition[];
  onClose: () => void;
  maxOrder?: number;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-white border-b border-gray-100">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={cn("p-1.5 rounded hover:bg-gray-100 transition-colors", editor.isActive('bold') && "bg-indigo-50 text-indigo-600")}
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={cn("p-1.5 rounded hover:bg-gray-100 transition-colors", editor.isActive('italic') && "bg-indigo-50 text-indigo-600")}
      >
        <Italic className="w-4 h-4" />
      </button>
      <div className="w-px h-4 bg-gray-200 self-center mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn("p-1.5 rounded hover:bg-gray-100 transition-colors", editor.isActive('bulletList') && "bg-indigo-50 text-indigo-600")}
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn("p-1.5 rounded hover:bg-gray-100 transition-colors", editor.isActive('orderedList') && "bg-indigo-50 text-indigo-600")}
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <div className="w-px h-4 bg-gray-200 self-center mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={cn("p-1.5 rounded hover:bg-gray-100 transition-colors", editor.isActive('codeBlock') && "bg-indigo-50 text-indigo-600")}
      >
        <Code className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn("p-1.5 rounded hover:bg-gray-100 transition-colors", editor.isActive('blockquote') && "bg-indigo-50 text-indigo-600")}
      >
        <Quote className="w-4 h-4" />
      </button>
      <button
        onClick={() => {
          const url = window.prompt('Enter URL');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        className={cn("p-1.5 rounded hover:bg-gray-100 transition-colors", editor.isActive('link') && "bg-indigo-50 text-indigo-600")}
      >
        <LinkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function TaskModal({ user, task, categories, statuses, columns, onClose, maxOrder = 0 }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [categoryId, setCategoryId] = useState(task?.categoryId || '');
  const [statusId, setStatusId] = useState(task?.statusId || (statuses[0]?.id || ''));
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'Medium');
  const [date, setDate] = useState(task?.date || format(new Date(), 'yyyy-MM-dd'));
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId || '');
  const [customFields, setCustomFields] = useState<Record<string, any>>(task?.customFields || {});
  
  const [activeTab, setActiveTab] = useState<'details' | 'logs' | 'comments'>('details');
  const [logs, setLogs] = useState<Log[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPinned, setIsPinned] = useState(task?.isPinned || false);
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Describe the task... Use lists, bold, etc.' }),
      Markdown,
    ],
    content: task?.description || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4',
      },
    },
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();

    if (!task) return;

    const unsubLogs = onSnapshot(
      query(collection(db, `tasks/${task.id}/logs`), orderBy('timestamp', 'desc')),
      (snapshot) => {
        setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `tasks/${task.id}/logs`)
    );

    const unsubComments = onSnapshot(
      query(collection(db, `tasks/${task.id}/comments`), orderBy('timestamp', 'asc')),
      (snapshot) => {
        setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `tasks/${task.id}/comments`)
    );

    return () => {
      unsubLogs();
      unsubComments();
    };
  }, [task]);

  const handleSave = async () => {
    if (!title || !editor) return;
    setIsSaving(true);

    const description = (editor as any).getMarkdown();
    const monthKey = format(new Date(), 'yyyy-MM');
    const assignee = users.find(u => u.uid === assigneeId);

    const taskData = {
      title,
      description,
      categoryId,
      statusId,
      priority,
      date,
      assigneeId,
      assigneeName: assignee?.displayName || '',
      customFields,
      isPinned,
      monthKey,
      updatedAt: serverTimestamp(),
    };

    try {
      if (task) {
        // Update
        await updateDoc(doc(db, 'tasks', task.id), taskData);
        
        // Log changes
        const changes: Record<string, any> = {};
        if (task.title !== title) changes.Title = { old: task.title, new: title };
        if (task.statusId !== statusId) {
          const oldS = statuses.find(s => s.id === task.statusId)?.name || 'Unknown';
          const newS = statuses.find(s => s.id === statusId)?.name || 'Unknown';
          changes.Status = { old: oldS, new: newS };
        }
        if (task.categoryId !== categoryId) {
          const oldC = categories.find(c => c.id === task.categoryId)?.name || 'None';
          const newC = categories.find(c => c.id === categoryId)?.name || 'None';
          changes.Category = { old: oldC, new: newC };
        }
        if (task.priority !== priority) changes.Priority = { old: task.priority, new: priority };
        if (task.isPinned !== isPinned) changes.Pinned = { old: task.isPinned ? 'Yes' : 'No', new: isPinned ? 'Yes' : 'No' };
        if (task.date !== date) changes['Due Date'] = { old: task.date || 'None', new: date || 'None' };
        if (task.assigneeId !== assigneeId) {
          const oldA = users.find(u => u.uid === task.assigneeId)?.displayName || 'Unassigned';
          const newA = users.find(u => u.uid === assigneeId)?.displayName || 'Unassigned';
          changes.Assignee = { old: oldA, new: newA };
        }

        // Custom fields
        columns.forEach(col => {
          const oldVal = task.customFields?.[col.id];
          const newVal = customFields[col.id];
          if (oldVal !== newVal) {
            changes[col.name] = { old: oldVal ?? 'None', new: newVal ?? 'None' };
          }
        });
        
        if (Object.keys(changes).length > 0) {
          await addDoc(collection(db, `tasks/${task.id}/logs`), {
            userId: user.uid,
            userName: user.displayName,
            action: 'Updated task',
            timestamp: serverTimestamp(),
            changes
          });
        }

        // Create notification for status change
        if (task.statusId !== statusId) {
          const status = statuses.find(s => s.id === statusId);
          await addDoc(collection(db, 'notifications'), {
            userId: task.createdBy,
            taskId: task.id,
            title: 'Status Update',
            message: `${user.displayName} changed status to ${status?.name}`,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      } else {
        // Create
        const newDocRef = doc(collection(db, 'tasks'));
        await setDoc(newDocRef, {
          ...taskData,
          createdBy: user.uid,
          creatorName: user.displayName,
          createdAt: serverTimestamp(),
          order: maxOrder + 1
        });

        await addDoc(collection(db, `tasks/${newDocRef.id}/logs`), {
          userId: user.uid,
          userName: user.displayName,
          action: 'Created task',
          timestamp: serverTimestamp(),
        });
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, task ? OperationType.UPDATE : OperationType.CREATE, 'tasks');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tasks');
    }
  };

  const handleDuplicate = async () => {
    if (!task || isSaving) return;
    setIsSaving(true);
    try {
      const newTaskData = {
        title: `${task.title} (Copy)`,
        description: task.description || '',
        categoryId: task.categoryId || '',
        statusId: task.statusId,
        priority: task.priority,
        date: task.date,
        assigneeId: task.assigneeId || '',
        assigneeName: task.assigneeName || '',
        customFields: task.customFields || {},
        isPinned: task.isPinned || false,
        createdBy: user.uid,
        createdByName: user.displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        commentCount: 0,
        order: maxOrder + 1000,
      };

      const newDocRef = await addDoc(collection(db, 'tasks'), newTaskData);

      await addDoc(collection(db, `tasks/${newDocRef.id}/logs`), {
        userId: user.uid,
        userName: user.displayName,
        action: `Duplicated from task #${task.id.slice(-4).toUpperCase()}`,
        timestamp: serverTimestamp(),
      });

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;
    try {
      await addDoc(collection(db, `tasks/${task.id}/comments`), {
        userId: user.uid,
        userName: user.displayName,
        text: newComment,
        timestamp: serverTimestamp(),
      });

      // Increment comment count on task
      await updateDoc(doc(db, 'tasks', task.id), {
        commentCount: increment(1)
      });

      // Notify creator and assignee
      const recipients = new Set<string>();
      if (task.createdBy !== user.uid) recipients.add(task.createdBy);
      if (task.assigneeId && task.assigneeId !== user.uid) recipients.add(task.assigneeId);

      for (const recipientId of recipients) {
        await addDoc(collection(db, 'notifications'), {
          userId: recipientId,
          taskId: task.id,
          title: 'New Comment',
          message: `${user.displayName} commented on task: "${task.title}"`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `tasks/${task.id}/comments`);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task || !window.confirm('Delete this comment?')) return;
    try {
      await deleteDoc(doc(db, `tasks/${task.id}/comments`, commentId));
      
      // Decrement comment count on task
      await updateDoc(doc(db, 'tasks', task.id), {
        commentCount: increment(-1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${task.id}/comments`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-100 p-2 rounded-xl">
              <Plus className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{task ? 'Edit Task' : 'New Task'}</h2>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">
                {task ? `ID: ${task.id.slice(-8).toUpperCase()}` : 'Creating new entry'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={cn(
                "p-2 rounded-full transition-all",
                isPinned 
                  ? "bg-amber-100 text-amber-600 hover:bg-amber-200" 
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              )}
              title={isPinned ? "Unpin task" : "Pin task to top"}
            >
              {isPinned ? <Pin className="w-6 h-6 fill-current" /> : <Pin className="w-6 h-6" />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 border-b border-gray-100 flex gap-8">
          {[
            { id: 'details', label: 'Details', icon: Plus },
            { id: 'logs', label: 'Activity Logs', icon: HistoryIcon },
            { id: 'comments', label: 'Comments', icon: MessageSquare }
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
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Core Info */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title..."
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all text-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                  <div className="bg-gray-50 border border-transparent focus-within:bg-white focus-within:border-indigo-500 rounded-xl overflow-hidden transition-all">
                    <MenuBar editor={editor} />
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </div>

              {/* Right Column: Metadata & Custom Fields */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status</label>
                    <select
                      value={statusId}
                      onChange={(e) => setStatusId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all text-sm"
                    >
                      {statuses.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all text-sm"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Category</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all text-sm"
                    >
                      <option value="">None</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Assignee</label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all text-sm"
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => (
                        <option key={u.uid} value={u.uid}>{u.displayName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Due Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Dynamic Columns */}
                {columns.length > 0 && (
                  <div className="pt-6 border-t border-gray-100">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Custom Fields</label>
                    <div className="space-y-4">
                      {columns.map(col => (
                        <div key={col.id}>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{col.name}</label>
                          {col.type === 'boolean' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!!customFields[col.id]}
                                onChange={(e) => setCustomFields({ ...customFields, [col.id]: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-600">Yes / No</span>
                            </div>
                          ) : (
                            <input
                              type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                              value={customFields[col.id] || ''}
                              onChange={(e) => setCustomFields({ ...customFields, [col.id]: e.target.value })}
                              className="w-full px-4 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all text-sm"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-gray-400 italic">No activity recorded yet.</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 w-px bg-gray-100 my-2" />
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-gray-900">{log.userName}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{log.timestamp ? format(log.timestamp.toDate(), 'MMM d, HH:mm') : 'Just now'}</span>
                      </div>
                      <p className="text-sm text-gray-600">{log.action}</p>
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-3 space-y-2">
                          {Object.entries(log.changes).map(([field, val]: [string, any]) => (
                            <div key={field} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                              <div className="px-3 py-1.5 bg-gray-100/50 border-b border-gray-100 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{field}</span>
                              </div>
                              <div className="p-3 grid grid-cols-2 gap-4 items-center">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Old Value</span>
                                  <div className="text-xs text-red-500 line-through truncate bg-red-50/50 px-2 py-1 rounded border border-red-100">
                                    {String(val.old)}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">New Value</span>
                                  <div className="text-xs text-green-600 font-medium truncate bg-green-50/50 px-2 py-1 rounded border border-green-100">
                                    {String(val.new)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 space-y-6 mb-8">
                {comments.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 italic">Be the first to comment.</div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                        <UserIcon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{comment.userName}</span>
                            <span className="text-[10px] text-gray-400">{comment.timestamp ? format(comment.timestamp.toDate(), 'MMM d, HH:mm') : 'Just now'}</span>
                          </div>
                          {(comment.userId === user.uid || task.createdBy === user.uid) && (
                            <button 
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none text-sm text-gray-700 border border-gray-100">
                          {comment.text}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="sticky bottom-0 bg-white pt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all text-sm"
                  />
                  <button
                    onClick={handleAddComment}
                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            {task && (
              <>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 text-red-500 hover:text-red-600 px-4 py-2 rounded-xl hover:bg-red-50 transition-all text-sm font-semibold"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <button
                  onClick={handleDuplicate}
                  disabled={isSaving}
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-all text-sm font-semibold"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !title}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xl shadow-indigo-100"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
