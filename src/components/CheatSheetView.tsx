import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Terminal, 
  Copy, 
  Trash2, 
  Edit3, 
  X, 
  Check,
  Code2,
  FileText,
  Zap
} from 'lucide-react';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  OperationType,
  handleFirestoreError
} from '../firebase';
import { CheatSheetItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface CheatSheetViewProps {
  user: any;
}

export default function CheatSheetView({ user }: CheatSheetViewProps) {
  const [items, setItems] = useState<CheatSheetItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CheatSheetItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [command, setCommand] = useState('');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState('');
  const [language, setLanguage] = useState('');

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      query(collection(db, 'cheatsheet'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CheatSheetItem)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'cheatsheet')
    );

    return unsub;
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command || !description) return;

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'cheatsheet', editingItem.id), {
          command,
          description,
          result,
          language,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'cheatsheet'), {
          command,
          description,
          result,
          language,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cheatsheet');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this cheat sheet item?')) return;
    try {
      await deleteDoc(doc(db, 'cheatsheet', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'cheatsheet');
    }
  };

  const openModal = (item?: CheatSheetItem) => {
    if (item) {
      setEditingItem(item);
      setCommand(item.command);
      setDescription(item.description);
      setResult(item.result);
      setLanguage(item.language || '');
    } else {
      setEditingItem(null);
      setCommand('');
      setDescription('');
      setResult('');
      setLanguage('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = items.filter(item => 
    item.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.language?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Cheat Sheet
          </h2>
          <p className="text-sm text-gray-500">Quick reference for commands, snippets, and debugging notes.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search commands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all text-sm w-full md:w-64"
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <motion.div 
              layout
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col"
            >
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <Terminal className="w-4 h-4 text-indigo-600" />
                    </div>
                    {item.language && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                        {item.language}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openModal(item)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Command</h3>
                  <div className="relative group/code">
                    <code className="block p-3 bg-gray-900 text-indigo-300 rounded-xl text-xs font-mono break-all pr-10">
                      {item.command}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(item.command, item.id)}
                      className="absolute right-2 top-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Description</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {item.result && (
                  <div className="mt-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Expected Result</h3>
                    <div className="p-4 bg-gray-900 text-emerald-400 rounded-xl text-xs border border-gray-800 font-mono whitespace-pre-wrap overflow-x-auto max-h-[200px] scrollbar-thin scrollbar-thumb-gray-700">
                      {item.result}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {filteredItems.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400">
              <Zap className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No cheat sheet items found</p>
              <button 
                onClick={() => openModal()}
                className="mt-4 text-indigo-600 font-semibold hover:underline"
              >
                Create your first one
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingItem ? 'Edit Item' : 'Add New Cheat Sheet Item'}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Command / Snippet</label>
                  <div className="relative">
                    <Terminal className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <textarea 
                      required
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="e.g. php artisan telegram:setup-webhook"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all text-sm font-mono min-h-[80px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <textarea 
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What does this command do?"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all text-sm min-h-[80px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Language / Tag</label>
                    <div className="relative">
                      <Code2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        placeholder="e.g. PHP, Bash, JS"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all text-sm"
                      />
                    </div>
                  </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Expected Result (Optional)</label>
                  <textarea 
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    placeholder="e.g. [+] Building 25.4s (9/9) FINISHED..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all text-sm font-mono min-h-[100px]"
                  />
                </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-2xl hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    {editingItem ? 'Save Changes' : 'Create Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
