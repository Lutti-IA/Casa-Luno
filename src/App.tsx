/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  LayoutDashboard, 
  Receipt, 
  Menu, 
  X,
  ChevronRight,
  PieChart as PieChartIcon,
  Calendar,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  Download,
  Settings
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Transaction, 
  REVENUE_CATEGORIES, 
  EXPENSE_CATEGORIES, 
  VARIANCE_CATEGORIES,
  TransactionType,
  RevenueCategory,
  ExpenseCategory
} from './types';
import { cn, formatCurrency } from './lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { getSupabase } from './lib/supabase';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [reportType, setReportType] = useState<'REVENUE' | 'EXPENSE' | 'VARIANCE'>('REVENUE');

  // Period State
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // Supabase dynamic config state
  const [supabaseConfig, setSupabaseConfig] = useState({
    url: localStorage.getItem('SUPABASE_URL') || '',
    key: localStorage.getItem('SUPABASE_ANON_KEY') || ''
  });

  const fetchTransactions = async () => {
    const dynamicSupabase = getSupabase();

    if (!dynamicSupabase) {
      const saved = localStorage.getItem('loterica_transactions');
      setTransactions(saved ? JSON.parse(saved) : []);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await dynamicSupabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Erro ao buscar dados:', error.message);
        throw error;
      }
      setTransactions(data || []);
    } catch (err) {
      console.error('Erro geral de conexão:', err);
      const saved = localStorage.getItem('loterica_transactions');
      setTransactions(saved ? JSON.parse(saved) : []);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem('SUPABASE_URL', supabaseConfig.url.trim());
    localStorage.setItem('SUPABASE_ANON_KEY', supabaseConfig.key.trim());
    
    // Import helper to reset client
    const { resetSupabaseClient } = await import('./lib/supabase');
    resetSupabaseClient();
    
    setShowSettingsModal(false);
    await fetchTransactions(); // Retry with new keys
  };

  // Form State
  const [formData, setFormData] = useState<{
    type: TransactionType;
    category: string;
    description: string;
    amount: string;
    date: string;
  }>({
    type: 'REVENUE',
    category: REVENUE_CATEGORIES[0],
    description: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    localStorage.setItem('loterica_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = t.date;
      return tDate >= dateRange.start && tDate <= dateRange.end;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, dateRange]);

  const totals = useMemo(() => {
    const revenue = filteredTransactions
      .filter(t => t.type === 'REVENUE')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const variance = filteredTransactions
      .filter(t => t.type === 'VARIANCE')
      .reduce((acc, curr) => acc + curr.amount, 0);
    return {
      revenue,
      expense,
      variance,
      balance: revenue - expense,
      halfBalance: (revenue - expense) / 2
    };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    // Group by date for the period, keeping revenue, expense and variance separate
    const dailyData: Record<string, { date: string, revenue: number, expense: number, variance: number }> = {};
    
    filteredTransactions.forEach(t => {
      if (!dailyData[t.date]) {
        dailyData[t.date] = { 
          date: format(new Date(t.date + 'T12:00:00'), 'dd/MM'), 
          revenue: 0, 
          expense: 0,
          variance: 0
        };
      }
      if (t.type === 'REVENUE') dailyData[t.date].revenue += t.amount;
      else if (t.type === 'EXPENSE') dailyData[t.date].expense += t.amount;
      else dailyData[t.date].variance += t.amount;
    });

    return Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data]) => data)
      .slice(-15);
  }, [filteredTransactions]);

  const revenueByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'REVENUE').forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + t.amount;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const expenseByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + t.amount;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const varianceByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'VARIANCE').forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + t.amount;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const handleAddTransaction = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) return;

    const newTransaction: Partial<Transaction> = {
      type: formData.type,
      category: formData.category as any,
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: formData.date
    };

    const dynamicSupabase = getSupabase();
    if (dynamicSupabase) {
      setLoading(true);
      try {
        const { data, error } = await dynamicSupabase
          .from('transactions')
          .insert([newTransaction])
          .select();
        
        if (error) {
          console.error('Erro ao salvar:', error.code, error.message);
          alert('Erro ao salvar no banco: ' + error.message);
          throw error;
        }
        if (data) setTransactions([data[0], ...transactions]);
      } catch (err) {
        console.error('Falha no salvamento:', err);
        // Fallback local se o DB falhar
        const localTx = { ...newTransaction, id: crypto.randomUUID() } as Transaction;
        setTransactions([localTx, ...transactions]);
      } finally {
        setLoading(false);
      }
    } else {
      const localTx = { ...newTransaction, id: crypto.randomUUID() } as Transaction;
      setTransactions([localTx, ...transactions]);
    }

    setShowAddModal(false);
    setFormData({
      ...formData,
      description: '',
      amount: ''
    });
  };

  const deleteTransaction = async (id: string) => {
    const dynamicSupabase = getSupabase();
    if (dynamicSupabase) {
      setLoading(true);
      try {
        const { error } = await dynamicSupabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
        setTransactions(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        console.error('Erro ao deletar:', err);
        alert('Erro ao deletar do banco.');
      } finally {
        setLoading(false);
      }
    } else {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const clearPeriodTransactions = async () => {
    if (filteredTransactions.length === 0) return;
    
    const confirmLabel = `Deseja realmente excluir os ${filteredTransactions.length} lançamentos deste período?`;
    if (window.confirm(confirmLabel)) {
      const filteredIds = filteredTransactions.map(t => t.id).filter(Boolean);
      
      const dynamicSupabase = getSupabase();
      if (dynamicSupabase && filteredIds.length > 0) {
        setLoading(true);
        try {
          const { error } = await dynamicSupabase
            .from('transactions')
            .delete()
            .in('id', filteredIds);
          
          if (error) throw error;
          setTransactions(prev => prev.filter(t => !filteredIds.includes(t.id)));
        } catch (err) {
          console.error('Erro ao limpar período:', err);
          alert('Erro ao limpar do banco.');
        } finally {
          setLoading(false);
        }
      } else {
        setTransactions(prev => prev.filter(t => !filteredIds.includes(t.id)));
      }
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#475569'];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900 font-sans">
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-60 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Conectar Supabase</h3>
                  <p className="text-xs text-slate-500 font-medium">Configure as chaves do seu banco de dados</p>
                </div>
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Supabase URL</label>
                  <input 
                    required
                    type="url"
                    placeholder="https://xyz...supabase.co"
                    value={supabaseConfig.url}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <p className="text-[10px] text-slate-400 px-1 italic">Dica: Encontre esta URL no menu Project Settings {"->"} API do seu Supabase.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Anon Public Key</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="eyJhbGci..."
                    value={supabaseConfig.key}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, key: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                  >
                    Salvar e Conectar
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                        window.open('https://supabase.com/dashboard', '_blank');
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs transition-all"
                  >
                    Abrir Dashboard Supabase
                  </button>
                </div>

                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
                    <strong>Aviso:</strong> Certifique-se de executar o script SQL fornecido no seu editor SQL do Supabase antes de conectar.
                  </p>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:translate-x-0 lg:static lg:block",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm shadow-blue-200">
                <Wallet size={20} />
              </div>
              <div>
                <h1 className="font-bold text-xl tracking-tight leading-tight">LotéricaSys</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enterprise</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 space-y-1">
            <button 
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-semibold text-sm",
                activeTab === 'dashboard' ? "bg-blue-50 text-blue-600 border-r-4 border-blue-600 -mr-6 px-6" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button 
              onClick={() => { setActiveTab('transactions'); setIsSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-semibold text-sm",
                activeTab === 'transactions' ? "bg-blue-50 text-blue-600 border-r-4 border-blue-600 -mr-6 px-6" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Receipt size={18} />
              Lançamentos
            </button>
            <button 
              onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-semibold text-sm",
                activeTab === 'reports' ? "bg-blue-50 text-blue-600 border-r-4 border-blue-600 -mr-6 px-6" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <PieChartIcon size={18} />
              Relatórios
            </button>
            <button 
              onClick={() => { setShowSettingsModal(true); setIsSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-semibold text-sm text-slate-500 hover:text-slate-800"
            >
              <Settings size={18} />
              Configurações
            </button>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100 space-y-4">
            {!getSupabase() && (
              <div 
                onClick={() => setShowSettingsModal(true)}
                className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-2 cursor-pointer hover:bg-amber-100 transition-colors"
              >
                <p className="text-[10px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                  <AlertCircle size={10} /> Não Conectado
                </p>
                <p className="text-[10px] text-amber-700 leading-tight">
                  Banco de dados offline. Clique aqui para configurar as chaves.
                </p>
              </div>
            )}
            <div className="bg-slate-100 p-4 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Saldo Atual</p>
              <p className={cn(
                "text-xl font-black truncate tracking-tight",
                totals.balance >= 0 ? "text-slate-900" : "text-rose-600"
              )}>
                {formatCurrency(totals.balance)}
              </p>
            </div>
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
              <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider mb-1">Divisão (50%)</p>
              <p className={cn(
                "text-lg font-bold truncate tracking-tight",
                totals.halfBalance >= 0 ? "text-blue-700" : "text-rose-600"
              )}>
                {formatCurrency(totals.halfBalance)}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-16 lg:h-20 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg text-slate-600"
              aria-label="Menu"
            >
              <Menu size={24} />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                {activeTab === 'dashboard' ? 'Dashboard' : 
                 activeTab === 'transactions' ? 'Lançamentos' : 'Relatórios'}
              </h2>
              <p className="hidden sm:block text-xs text-slate-500 font-medium whitespace-nowrap">
                {format(new Date(), "d 'de' MMMM, yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Lançamento</span>
          </button>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 pb-24 lg:pb-12 relative">
          {loading && (
            <div className="absolute top-4 right-4 sm:right-8 flex items-center gap-2 text-slate-400 font-medium text-[10px] sm:text-xs bg-white/80 px-3 py-1.5 rounded-full border border-slate-100 shadow-sm z-20">
              <Loader2 size={12} className="animate-spin" />
              Sincronizando...
            </div>
          )}
          
          {/* Global Period Filter */}
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={18} className="text-blue-600" />
              <span className="text-sm font-bold tracking-tight">Período de Relatório</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 w-full sm:w-auto">
                <input 
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none w-full"
                />
                <span className="text-slate-400 text-[10px] font-bold uppercase">Até</span>
                <input 
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none w-full"
                />
              </div>
              
              {filteredTransactions.length > 0 && (
                <button 
                  onClick={clearPeriodTransactions}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-colors border border-rose-100 active:scale-95 shadow-sm sm:shadow-none"
                  title="Zerar lançamentos do período"
                >
                  <Trash2 size={14} />
                  Zerar Período
                </button>
              )}
            </div>
          </div>

          {activeTab === 'dashboard' ? (
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Receitas Brutas</h3>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(totals.revenue)}</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                      <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Despesas Totais</h3>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-rose-600 tracking-tight">{formatCurrency(totals.expense)}</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      <h3 className="text-amber-600 font-bold text-xs uppercase tracking-wider">Quebra de Caixa</h3>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-amber-700 tracking-tight">{formatCurrency(totals.variance)}</p>
                </motion.div>
              </div>

              {/* Summary Bottom Cards (Moved to grid row below for better mobile flow if needed, but keeping it 4 and 2 for now) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Balanço Atual</h3>
                    </div>
                  </div>
                  <p className={cn(
                    "text-2xl font-black tracking-tight",
                    totals.balance >= 0 ? "text-slate-900" : "text-rose-600"
                  )}>
                    {formatCurrency(totals.balance)}
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-blue-50/30 p-5 rounded-2xl border border-blue-100 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      <h3 className="text-blue-600 font-bold text-xs uppercase tracking-wider">Partilha (50%)</h3>
                    </div>
                  </div>
                  <p className={cn(
                    "text-2xl font-black tracking-tight",
                    totals.halfBalance >= 0 ? "text-blue-700" : "text-rose-600"
                  )}>
                    {formatCurrency(totals.halfBalance)}
                  </p>
                </motion.div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Evolution Bar Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="text-blue-600" size={18} />
                    <h4 className="font-bold text-md tracking-tight">Fluxo de Caixa Mensal</h4>
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        />
                        <Bar name="Receita" dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar name="Despesa" dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        <Bar name="Quebra" dataKey="variance" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Categories Pie Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <PieChartIcon className="text-blue-600" size={18} />
                    <h4 className="font-bold text-md tracking-tight">Distribuição de Receitas</h4>
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenueByCategory.length > 0 ? revenueByCategory : [{ name: 'Sem dados', value: 1 }]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {revenueByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', shadow: 'none', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recent Transactions List */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-lg">Recent Transactions</h4>
                  <button 
                    onClick={() => setActiveTab('transactions')}
                    className="text-indigo-600 font-semibold text-sm hover:underline"
                  >
                    Ver Tudo
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                    <th className="px-6 py-4 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.slice(0, 5).map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        {format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          t.type === 'REVENUE' ? "bg-emerald-50 text-emerald-700" : 
                          t.type === 'EXPENSE' ? "bg-rose-50 text-rose-700" :
                          "bg-amber-50 text-amber-700"
                        )}>
                          {t.type === 'REVENUE' ? 'Receita' : t.type === 'EXPENSE' ? 'Despesa' : 'Quebra'}
                        </span>
                      </td>
                          <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[200px]">
                            {t.description || '-'}
                          </td>
                          <td className={cn(
                            "px-6 py-4 text-sm font-bold text-right",
                            t.type === 'REVENUE' ? "text-emerald-600" : 
                            t.type === 'EXPENSE' ? "text-rose-600" :
                            "text-amber-600"
                          )}>
                            {t.type === 'REVENUE' ? '+' : t.type === 'EXPENSE' ? '-' : '±'} {formatCurrency(t.amount)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => deleteTransaction(t.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-2"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                            Nenhum lançamento no sistema.
                          </td>
                        </tr>
                      )}
                      {transactions.length > 0 && filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                            Nenhum lançamento neste período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'transactions' ? (
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-lg tracking-tight">Histórico</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{filteredTransactions.length} itens</p>
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Tipo</th>
                        <th className="px-6 py-4">Categoria</th>
                        <th className="px-6 py-4">Descrição</th>
                        <th className="px-6 py-4 text-right">Valor</th>
                        <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm">
                            {format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {t.type === 'REVENUE' ? (
                        <TrendingUp size={14} className="text-emerald-500" />
                      ) : t.type === 'EXPENSE' ? (
                        <TrendingDown size={14} className="text-rose-500" />
                      ) : (
                        <Receipt size={14} className="text-amber-500" />
                      )}
                      <span className="text-xs font-bold uppercase tracking-tight">
                        {t.type === 'REVENUE' ? 'Receita' : t.type === 'EXPENSE' ? 'Despesa' : 'Quebra'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold">{t.category}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {t.description || '-'}
                  </td>
                  <td className={cn(
                    "px-6 py-4 text-sm font-bold text-right",
                    t.type === 'REVENUE' ? "text-emerald-600" : 
                    t.type === 'EXPENSE' ? "text-rose-600" :
                    "text-amber-600"
                  )}>
                    {t.type === 'REVENUE' ? '+' : t.type === 'EXPENSE' ? '-' : '±'} {formatCurrency(t.amount)}
                  </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => deleteTransaction(t.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-2"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {filteredTransactions.map(t => (
                    <div key={t.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          t.type === 'REVENUE' ? "bg-emerald-50 text-emerald-600" : 
                          t.type === 'EXPENSE' ? "bg-rose-50 text-rose-600" :
                          "bg-amber-50 text-amber-600"
                        )}>
                          {t.type === 'REVENUE' ? <TrendingUp size={20} /> : 
                           t.type === 'EXPENSE' ? <TrendingDown size={20} /> :
                           <Receipt size={20} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {t.description || t.category}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy')} • {t.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn(
                          "text-sm font-black",
                          t.type === 'REVENUE' ? "text-emerald-600" : 
                          t.type === 'EXPENSE' ? "text-rose-600" :
                          "text-amber-600"
                        )}>
                          {t.type === 'REVENUE' ? '+' : t.type === 'EXPENSE' ? '-' : '±'} {formatCurrency(t.amount)}
                        </p>
                        <button 
                          onClick={() => deleteTransaction(t.id)}
                          className="text-[10px] text-slate-400 hover:text-rose-600 font-bold mt-1"
                        >
                          EXCLUIR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredTransactions.length === 0 && (
                  <div className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt size={48} className="text-slate-200" />
                      <p className="text-slate-500 font-medium italic">Nenhum lançamento registrado.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Report Controls */}
              <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 w-fit">
                <button 
                  onClick={() => setReportType('REVENUE')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                    reportType === 'REVENUE' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  Relatório de Receitas
                </button>
                <button 
                  onClick={() => setReportType('EXPENSE')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                    reportType === 'EXPENSE' ? "bg-rose-600 text-white shadow-lg shadow-rose-100" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  Relatório de Despesas
                </button>
                <button 
                  onClick={() => setReportType('VARIANCE')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                    reportType === 'VARIANCE' ? "bg-amber-600 text-white shadow-lg shadow-amber-100" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  Quebra de Caixa
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Table Breakdown */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h4 className="font-bold text-lg tracking-tight">Detalhamento por Categoria</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                          <th className="px-6 py-4">Categoria</th>
                          <th className="px-6 py-4">Lançamentos</th>
                          <th className="px-6 py-4 text-right">Peso %</th>
                          <th className="px-6 py-4 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(reportType === 'REVENUE' ? revenueByCategory : reportType === 'EXPENSE' ? expenseByCategory : varianceByCategory)
                          .sort((a, b) => b.value - a.value)
                          .map((item, idx) => {
                            const totalValue = reportType === 'REVENUE' ? totals.revenue : reportType === 'EXPENSE' ? totals.expense : totals.variance;
                            const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
                            const count = filteredTransactions.filter(t => t.category === item.name && t.type === reportType).length;

                            return (
                              <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                    <span className="text-sm font-bold text-slate-700">{item.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                  {count} lançamentos
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className="text-xs font-bold text-slate-400">
                                    {percentage.toFixed(1)}%
                                  </span>
                                </td>
                                <td className={cn(
                                  "px-6 py-4 text-right font-black text-sm",
                                  reportType === 'REVENUE' ? "text-emerald-600" : 
                                  reportType === 'EXPENSE' ? "text-rose-600" : "text-amber-600"
                                )}>
                                  {formatCurrency(item.value)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-black">
                          <td colSpan={3} className="px-6 py-5 text-sm text-slate-900 uppercase">Total Consolidado</td>
                          <td className={cn(
                            "px-6 py-5 text-right text-lg",
                            reportType === 'REVENUE' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {formatCurrency(reportType === 'REVENUE' ? totals.revenue : totals.expense)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Vertical Bar Chart Comparison */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-lg tracking-tight mb-6">Comparativo Visual</h4>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        layout="vertical" 
                        data={(reportType === 'REVENUE' ? revenueByCategory : reportType === 'EXPENSE' ? expenseByCategory : varianceByCategory).sort((a, b) => b.value - a.value).slice(0, 10)}
                        margin={{ left: -20 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          scale="band" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                          width={100}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: '11px' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {(reportType === 'REVENUE' ? revenueByCategory : reportType === 'EXPENSE' ? expenseByCategory : varianceByCategory).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Mobile Floating Action Button */}
        <button 
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 lg:hidden w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-200 flex items-center justify-center active:scale-95 transition-transform z-40 border-4 border-white"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      </main>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative">
                <h3 className="text-xl font-bold text-slate-900">Novo Lançamento</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="p-6 space-y-6">
                {/* Type Toggles */}
                <div className="grid grid-cols-3 gap-3 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'REVENUE', category: REVENUE_CATEGORIES[0] })}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                      formData.type === 'REVENUE' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"
                    )}
                  >
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'EXPENSE', category: EXPENSE_CATEGORIES[0] })}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                      formData.type === 'EXPENSE' ? "bg-white text-rose-600 shadow-sm" : "text-slate-400"
                    )}
                  >
                    <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                    Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'VARIANCE', category: VARIANCE_CATEGORIES[0] })}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                      formData.type === 'VARIANCE' ? "bg-white text-amber-600 shadow-sm" : "text-slate-400"
                    )}
                  >
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Quebra
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Category Selection */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 transition-all focus-within:border-blue-200 focus-within:bg-white">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Categoria</span>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="text-right bg-transparent outline-none font-bold text-sm text-slate-800 cursor-pointer min-w-[150px]"
                    >
                      {formData.type === 'REVENUE' ? (
                        REVENUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                      ) : formData.type === 'EXPENSE' ? (
                        EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                      ) : (
                        VARIANCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                      )}
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 border border-slate-100 transition-all focus-within:border-blue-200 focus-within:bg-white">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Data</span>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="bg-transparent outline-none font-bold text-sm text-slate-800"
                      />
                    </label>
                    <label className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 border border-slate-100 transition-all focus-within:border-blue-200 focus-within:bg-white">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Valor (R$)</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="bg-transparent outline-none font-bold text-sm text-slate-800 text-right"
                        required
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 transition-all focus-within:border-blue-200 focus-within:bg-white">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">
                      {formData.type === 'EXPENSE' ? 'Motivo/Descrição' : 'Observação'}
                    </span>
                    <textarea
                      placeholder={formData.type === 'EXPENSE' ? 'Especifique o destino do recurso...' : 'Informações adicionais...'}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-transparent outline-none font-medium text-xs text-slate-600 resize-none min-h-[80px]"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg active:scale-[0.98] tracking-wide"
                  >
                    Salvar Lançamento
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
