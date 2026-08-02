/*
  manifest.json configuration:
  {
    "name": "MyFinance",
    "short_name": "MyFinance",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#F8FAFC",
    "theme_color": "#F8FAFC",
    "icons": [
      {
        "src": "https://picsum.photos/seed/finance/192/192",
        "sizes": "192x192",
        "type": "image/png"
      },
      {
        "src": "https://picsum.photos/seed/finance/512/512",
        "sizes": "512x512",
        "type": "image/png"
      }
    ]
  }
*/

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, 
  Users, 
  User, 
  TrendingUp, 
  Utensils, 
  Home, 
  Dumbbell, 
  Coffee,
  ChevronRight,
  ChevronLeft,
  Trash2,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Settings,
  Sparkles,
  Briefcase,
  Store,
  Banknote,
  MousePointer2,
  ArrowUpRight,
  ArrowDownLeft,
  LayoutDashboard,
  ReceiptText,
  LogOut,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  GripVertical,
  Scale,
  Search,
  X,
  LineChart as LineChartIcon
} from 'lucide-react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  LineChart
} from 'recharts';
import { supabase } from './lib/supabase';
import Auth from './Auth';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import toast, { Toaster } from 'react-hot-toast';

// --- Types ---
type TransactionType = 'Income' | 'Expense';
type Urgency = 'Essential' | 'Lifestyle' | 'Investment' | 'Business' | null;

interface CategoryRecord {
  id: string;
  name: string;
  emoji: string;
  type: TransactionType;
  urgency: Urgency;
  is_business: boolean;
  sort_order: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  isShared: boolean;
  urgency: Urgency;
  date: Date;
  user_id: string;
  business_name?: string;
  paid_by?: string | null;
}

// --- Constants ---
// Used as the initial/fallback category list: on load the app tries to fetch
// user-customized categories from Supabase's `categories` table; if that
// table doesn't exist yet (migration not run) or is empty, this seed is used
// instead so the app keeps working. See supabase/schema.sql.
const DEFAULT_CATEGORIES_SEED: CategoryRecord[] = [
  // Income
  { id: 'default-salario', name: 'Salário', emoji: '💰', type: 'Income', urgency: null, is_business: false, sort_order: 0 },
  { id: 'default-investimentos', name: 'Investimentos', emoji: '📈', type: 'Income', urgency: null, is_business: false, sort_order: 1 },
  { id: 'default-business1', name: 'Business #1', emoji: '🏪', type: 'Income', urgency: null, is_business: true, sort_order: 2 },
  { id: 'default-business2', name: 'Business #2', emoji: '🏬', type: 'Income', urgency: null, is_business: true, sort_order: 3 },
  { id: 'default-business3', name: 'Business #3', emoji: '🏭', type: 'Income', urgency: null, is_business: true, sort_order: 4 },
  { id: 'default-outrosrend', name: 'Outros Rendimentos', emoji: '👛', type: 'Income', urgency: null, is_business: false, sort_order: 5 },

  // Essential (D1)
  { id: 'default-habitacao', name: 'Habitação', emoji: '🏠', type: 'Expense', urgency: 'Essential', is_business: false, sort_order: 0 },
  { id: 'default-utilidades', name: 'Utilidades', emoji: '⚡', type: 'Expense', urgency: 'Essential', is_business: false, sort_order: 1 },
  { id: 'default-alimentacao', name: 'Alimentação', emoji: '🛒', type: 'Expense', urgency: 'Essential', is_business: false, sort_order: 2 },
  { id: 'default-transporte', name: 'Transporte', emoji: '🚗', type: 'Expense', urgency: 'Essential', is_business: false, sort_order: 3 },
  { id: 'default-saude', name: 'Saúde', emoji: '🩺', type: 'Expense', urgency: 'Essential', is_business: false, sort_order: 4 },
  { id: 'default-obrigacoes', name: 'Obrigações', emoji: '🏛️', type: 'Expense', urgency: 'Essential', is_business: false, sort_order: 5 },

  // Lifestyle (D2)
  { id: 'default-restauracao', name: 'Restauração', emoji: '🍽️', type: 'Expense', urgency: 'Lifestyle', is_business: false, sort_order: 0 },
  { id: 'default-educacao', name: 'Educação', emoji: '📚', type: 'Expense', urgency: 'Lifestyle', is_business: false, sort_order: 1 },
  { id: 'default-lazer', name: 'Lazer', emoji: '🎬', type: 'Expense', urgency: 'Lifestyle', is_business: false, sort_order: 2 },
  { id: 'default-cuidadopessoal', name: 'Cuidado Pessoal', emoji: '✨', type: 'Expense', urgency: 'Lifestyle', is_business: false, sort_order: 3 },
  { id: 'default-doacoes', name: 'Doações', emoji: '🎁', type: 'Expense', urgency: 'Lifestyle', is_business: false, sort_order: 4 },
  { id: 'default-viagens', name: 'Viagens', emoji: '✈️', type: 'Expense', urgency: 'Lifestyle', is_business: false, sort_order: 5 },

  // Investment
  { id: 'default-accoes', name: 'Acções', emoji: '📊', type: 'Expense', urgency: 'Investment', is_business: false, sort_order: 0 },
  { id: 'default-criptos', name: 'Criptos', emoji: '🪙', type: 'Expense', urgency: 'Investment', is_business: false, sort_order: 1 },
  { id: 'default-poupanca', name: 'Poupança', emoji: '🐷', type: 'Expense', urgency: 'Investment', is_business: false, sort_order: 2 },

  // Business
  { id: 'default-materiaprima', name: 'Matéria-Prima', emoji: '📦', type: 'Expense', urgency: 'Business', is_business: false, sort_order: 0 },
  { id: 'default-marketing', name: 'Marketing', emoji: '📣', type: 'Expense', urgency: 'Business', is_business: false, sort_order: 1 },
  { id: 'default-apps', name: 'Apps', emoji: '🌐', type: 'Expense', urgency: 'Business', is_business: false, sort_order: 2 },
  { id: 'default-logistica', name: 'Logística', emoji: '🚚', type: 'Expense', urgency: 'Business', is_business: false, sort_order: 3 },
  { id: 'default-equipamento', name: 'Equipamento', emoji: '🔧', type: 'Expense', urgency: 'Business', is_business: false, sort_order: 4 },
  { id: 'default-outros', name: 'Outros', emoji: '➖', type: 'Expense', urgency: 'Business', is_business: false, sort_order: 5 },
];

// ─── Default Preferences ─────────────────────────────────────────────────────
// These are just the starting values for a fresh install. Everything here is
// editable at runtime from Settings → Preferências and persisted to Supabase
// (see supabase/schema.sql). A solo user can turn "Duo" mode off entirely;
// someone without a side business can hide the business features.
const DEFAULT_PREFS = {
  household_mode: 'duo' as 'solo' | 'duo', // 'duo' = two people who split shared costs; 'solo' = one person
  partner_1_name: 'Partner 1',
  partner_2_name: 'Partner 2',
  businesses_enabled: true,
};
type Preferences = typeof DEFAULT_PREFS;
// ─────────────────────────────────────────────────────────────────────────────

// A curated set of emoji relevant to money/lifestyle categories, shown in the
// in-app emoji picker when adding or editing a category/business.
const EMOJI_PICKER_OPTIONS: string[] = [
  '💰', '💵', '💳', '🏦', '📈', '📉', '📊', '🪙', '🐷', '👛', '💼', '🧾',
  '🏠', '🏢', '🏛️', '🔑', '⚡', '💡', '🚿', '🌡️',
  '🛒', '🍽️', '🍔', '☕', '🍷', '🍕',
  '🚗', '🚕', '🚌', '🚆', '🚲', '⛽', '✈️', '🧳',
  '🩺', '💊', '🏥', '🧠', '🦷',
  '📚', '🎓', '✏️', '💻',
  '🎬', '🎮', '🎧', '🎉', '🎁', '🎨', '⚽', '🏋️',
  '✨', '💅', '🧴', '👗', '👟',
  '🐾', '🌿', '🍀', '🌱', '✂️', '🧵', '🪡',
  '📦', '🚚', '📣', '🌐', '🔧', '🛠️', '🏗️',
  '❤️', '🎗️', '🙏', '👶', '🐶', '🐱',
  '➕', '➖', '⭐', '🔘', '📌'
];




const INITIAL_DATA: Transaction[] = [];

const COLORS = {
  shared: '#2DD4BF', // Soft Teal
  personal: '#F59E0B', // Warm Amber
  income: '#10B981', // Emerald
  essential: '#F59E0B', // Orange (Amber)
  lifestyle: '#3B82F6', // Blue
  others: ['#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0']
};

const CATEGORY_COLORS: Record<string, string> = {
  'Essencial': '#C2410C', // Deep Orange
  'Habitação': '#C2410C', // Deep Orange
  'Utilidades': '#F97316', // Bright Orange
  'Alimentação': '#FB923C', // Apricot
  'Transporte': '#FDBA74', // Peach
  'Saúde': '#FDBA74', // Peach
  'Obrigações': '#FDBA74', // Peach
  'Lazer': '#042F2E', // Deep Teal
  'Restauração': '#0D9488', // Teal Green
  'Cuidado Pessoal': '#2DD4BF', // Aquamarine
  'Viagens': '#075985', // Ocean Blue
  'Educação': '#075985', // Ocean Blue
  'Doações': '#075985', // Ocean Blue
  'Lifestyle': '#075985', // Ocean Blue
  'Acções': '#6366f1', // Indigo
  'Criptos': '#6366f1', // Indigo
  'Poupança': '#6366f1', // Indigo
  'Business #1': '#475569',
  'Business #2': '#475569',
  'Business #3': '#475569',
};

// getCategoryColor is defined inside the App component (it needs to look up
// dynamic, user-editable categories rather than the static seed list).

// A single draggable row in a Settings category/business group. Split out as
// its own component (rather than inlined in a .map()) because useDragControls
// is a hook, and hooks can't be called inside a loop.
function CategoryRow({
  cat,
  inUse,
  atMin,
  onEdit,
  onDelete,
  onDragEnd
}: {
  cat: CategoryRecord;
  inUse: boolean;
  atMin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragEnd: () => void;
}) {
  const dragControls = useDragControls();
  const blockedReason = inUse ? 'Em uso - não pode ser removida' : atMin ? 'Mínimo atingido' : 'Remover';

  return (
    <Reorder.Item
      value={cat}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      as="div"
      className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="p-1 -ml-1 text-slate-300 cursor-grab active:cursor-grabbing shrink-0"
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <span className="text-lg shrink-0">{cat.emoji}</span>
        <span className="text-sm font-bold text-slate-700 truncate">{cat.name}</span>
        {inUse && <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest shrink-0">Em uso</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-slate-900 transition-all"
          title="Editar"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={inUse || atMin}
          className={`p-2 transition-all ${inUse || atMin ? 'text-slate-200 cursor-not-allowed' : 'text-rose-400 hover:text-rose-600'}`}
          title={blockedReason}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Reorder.Item>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryRecord[]>(DEFAULT_CATEGORIES_SEED);
  const [budgets, setBudgets] = useState<Record<string, number | null>>({ Essential: null, Lifestyle: null, Investment: null, Business: null });
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Derived preference shortcuts used throughout the app.
  const isDuo = prefs.household_mode === 'duo';
  const businessesEnabled = prefs.businesses_enabled;
  const partnerNames = [prefs.partner_1_name, prefs.partner_2_name];

  // Real "today", used for sensible defaults and to cap navigation at the
  // current year (instead of a hardcoded date that would go stale).
  const currentRealYear = new Date().getFullYear();
  const currentRealMonth = new Date().getMonth();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchTransactions();
      fetchCategories();
      fetchBudgets();
      fetchPreferences();
    }
  }, [session]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      setTransactions(data.map(t => ({
        ...t,
        date: new Date(t.date),
        type: (t.type === 'income' ? 'Income' : 'Expense') as TransactionType,
        urgency: (t.group_type === 'essencial' ? 'Essential' : 
                 (t.group_type === 'lifestyle' ? 'Lifestyle' : 
                 (t.group_type === 'investimento' ? 'Investment' : 
                 (t.group_type === 'negocio' ? 'Business' : null)))) as Urgency,
        business_name: t.business_name,
        paid_by: t.paid_by || null
      })));
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Categories/businesses are user-editable and stored in Supabase (see
  // supabase/schema.sql). If that table hasn't been created yet, or is empty, we
  // fall back to - and, for an empty table, seed it with - the built-in
  // defaults so the app keeps working either way.
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setCategories(data as CategoryRecord[]);
      } else {
        const { data: seeded, error: seedError } = await supabase
          .from('categories')
          .insert(DEFAULT_CATEGORIES_SEED.map(({ id, ...rest }) => rest))
          .select();

        if (seedError) throw seedError;
        setCategories((seeded as CategoryRecord[]) || DEFAULT_CATEGORIES_SEED);
      }
    } catch (err) {
      console.error('Error fetching categories (using built-in defaults; run supabase/schema.sql to create it):', err);
      setCategories(DEFAULT_CATEGORIES_SEED);
    }
  };

  // Budgets: one optional monthly limit per Prioridade group (Essencial,
  // Lifestyle, Negócio, Investimento), personal-mode only. See
  // supabase/schema.sql. Falls back to "no limits set" if the table
  // doesn't exist yet - nothing else in the app depends on it.
  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase.from('budgets').select('*');
      if (error) throw error;
      const map: Record<string, number | null> = { Essential: null, Lifestyle: null, Investment: null, Business: null };
      (data || []).forEach((row: any) => { map[row.urgency] = row.monthly_budget; });
      setBudgets(map);
    } catch (err) {
      console.error('Error fetching budgets (table may not exist yet; run supabase/schema.sql):', err);
    }
  };

  const saveBudget = async (urgency: 'Essential' | 'Lifestyle' | 'Investment' | 'Business', value: number | null) => {
    try {
      const { error } = await supabase.from('budgets').upsert({ urgency, monthly_budget: value }, { onConflict: 'urgency' });
      if (error) throw error;
    } catch (err) {
      console.error('Error saving budget:', err);
      toast.error('Erro ao guardar orçamento (verifica se a tabela budgets existe).');
    }
  };

  // Preferences: household mode (solo/duo), partner names, and whether the
  // business features are shown. Stored as a single-row key/value-ish table
  // (see supabase/schema.sql). Falls back to sensible defaults (duo, with
  // businesses on) if the table doesn't exist yet.
  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase.from('preferences').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      if (data) {
        setPrefs({
          household_mode: data.household_mode === 'solo' ? 'solo' : 'duo',
          partner_1_name: data.partner_1_name || DEFAULT_PREFS.partner_1_name,
          partner_2_name: data.partner_2_name || DEFAULT_PREFS.partner_2_name,
          businesses_enabled: data.businesses_enabled ?? true,
        });
      } else {
        // Seed the single preferences row on first run.
        await supabase.from('preferences').insert({ id: 1, ...DEFAULT_PREFS });
      }
    } catch (err) {
      console.error('Error fetching preferences (table may not exist yet; run supabase/schema.sql):', err);
    }
  };

  const savePreference = async (patch: Partial<Preferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next); // optimistic
    try {
      const { error } = await supabase.from('preferences').upsert({ id: 1, ...next }, { onConflict: 'id' });
      if (error) throw error;
    } catch (err) {
      console.error('Error saving preference:', err);
      toast.error('Erro ao guardar preferência (verifica se a tabela preferences existe).');
    }
  };

  // Category color lookup: known defaults keep their curated hex, anything
  // else (renamed/new user categories) falls back to Income green or a
  // neutral gray so charts never break for a category we don't recognize.
  const getCategoryColor = (name: string) => {
    if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
    const cat = categories.find(c => c.name === name);
    if (!cat) return '#CBD5E1';
    if (cat.type === 'Income') return COLORS.income;
    return '#CBD5E1';
  };

  // A category/business can't be renamed or deleted while it's referenced by
  // existing transactions (per your call to block, not cascade or archive).
  const isCategoryInUse = (name: string) => transactions.some(t => t.category === name || t.business_name === name);

  const isBusinessCategory = (name: string) => categories.some(c => c.name === name && c.type === 'Income' && c.is_business);

  const [activeView, setActiveView] = useState<'dashboard' | 'list' | 'add' | 'insights' | 'business' | 'profile'>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [selectedBusiness, setSelectedBusiness] = useState<string>('Business #1');
  const [businessPerformanceView, setBusinessPerformanceView] = useState<'monthly' | 'yearly'>('monthly');
  const [businessBreakdownView, setBusinessBreakdownView] = useState<'total' | 'yearly'>('yearly');

  // Businesses are just Income categories flagged is_business - keep
  // selectedBusiness pointing at a real one (e.g. after a rename in Settings).
  const businessCategories = categories.filter(c => c.type === 'Income' && c.is_business).sort((a, b) => a.sort_order - b.sort_order);
  useEffect(() => {
    if (businessCategories.length === 0) return;
    if (!businessCategories.some(b => b.name === selectedBusiness)) {
      setSelectedBusiness(businessCategories[0].name);
    }
  }, [categories]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Detailed Insights State
  const [selectedInsightGroup, setSelectedInsightGroup] = useState<'Income' | 'Essential' | 'Lifestyle' | 'Business' | 'Investment'>('Essential');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Keep the UI out of business-only areas when businesses are turned off.
  useEffect(() => {
    if (!businessesEnabled && activeView === 'business') {
      setActiveView('dashboard');
    }
    if (!businessesEnabled && selectedInsightGroup === 'Business') {
      setSelectedInsightGroup('Essential');
    }
  }, [businessesEnabled, activeView, selectedInsightGroup]);
  
  // Date Filter State
  const [selectedYear, setSelectedYear] = useState(currentRealYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(currentRealMonth);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Chart Options State
  const [compositionPeriod, setCompositionPeriod] = useState<'6m' | '12m' | 'ytd'>('6m');
  const [yoyViewMode, setYoyViewMode] = useState<'main' | 'sub'>('sub');
  const [yoyActiveIndex, setYoyActiveIndex] = useState<number | null>(null);
  const [trendActiveIndex, setTrendActiveIndex] = useState<number | null>(null);
  const [businessActiveIndex, setBusinessActiveIndex] = useState<number | null>(null);
  const [compositionActiveIndex, setCompositionActiveIndex] = useState<number | null>(null);
  const [donutActiveIndex, setDonutActiveIndex] = useState<number | null>(null);
  const [businessBreakdownActiveIndex, setBusinessBreakdownActiveIndex] = useState<number | null>(null);

  // Pinned chart tooltips (trigger="click") stay open until dismissed. Without
  // this, clicking anywhere else on the page left the tooltip floating over the
  // chart, covering the very bars you'd need to click next. On any mousedown we
  // clear every pinned tooltip; if the click landed on a chart, that chart's own
  // onClick fires afterwards and re-pins the right bar. Interactions with the
  // tooltip itself (e.g. scrolling a long category list) are left alone.
  useEffect(() => {
    const dismissPinnedTooltips = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('.recharts-tooltip-wrapper')) return;
      setYoyActiveIndex(null);
      setTrendActiveIndex(null);
      setBusinessActiveIndex(null);
      setCompositionActiveIndex(null);
      setDonutActiveIndex(null);
      setBusinessBreakdownActiveIndex(null);
    };
    document.addEventListener('mousedown', dismissPinnedTooltips);
    return () => document.removeEventListener('mousedown', dismissPinnedTooltips);
  }, []);

  // Perspective Toggle State. The raw value is what the user toggled; the
  // effective viewMode is forced to 'personal' for solo households (family
  // splitting is meaningless with one person), so every downstream consumer
  // of viewMode keeps working without change.
  const [viewModeRaw, setViewModeRaw] = useState<'family' | 'personal'>('family');
  const viewMode = isDuo ? viewModeRaw : 'personal';
  const setViewMode = setViewModeRaw;

  // Chart Visibility State
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({
    Essencial: true,
    Lifestyle: true,
    Negócios: true,
    Investimentos: true,
    income: true
  });

  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Confirmation Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'bulk'>('single');
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  // --- Shared/Personal amount helpers ---
  // Single source of truth for the "Family = shared transactions only, full
  // amount" vs "Personal = every transaction, shared ones halved" split that
  // was previously re-implemented inline in every stats/insights memo below.
  const filterByMode = (txs: Transaction[], mode: 'family' | 'personal' = viewMode): Transaction[] => {
    return mode === 'family' ? txs.filter(t => t.isShared) : txs;
  };

  const amountForMode = (t: Transaction, mode: 'family' | 'personal' = viewMode): number => {
    return mode === 'personal' && t.isShared ? t.amount * 0.5 : t.amount;
  };

  // --- Insights Data ---
  const insightsData = useMemo(() => {
    const referenceYear = selectedYear;
    const referenceMonth = selectedMonth !== null ? selectedMonth : new Date().getMonth();
    
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(referenceYear, referenceMonth - i, 1);
      months.push({
        month: d.toLocaleString('pt-PT', { month: 'short' }),
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
        value: 0
      });
    }

    const baseTransactions = filterByMode(transactions);

    const currentMonthTransactions = baseTransactions.filter(t => {
      const d = new Date(t.date);
      const yearMatch = d.getFullYear() === selectedYear;
      const monthMatch = selectedMonth === null || d.getMonth() === selectedMonth;
      return yearMatch && monthMatch;
    });

    const groupTransactions = currentMonthTransactions.filter(t => {
      if (selectedInsightGroup === 'Income') return t.type === 'Income';
      return t.urgency === selectedInsightGroup && t.type === 'Expense';
    });

    const totalAmount = groupTransactions.reduce((acc, t) => acc + amountForMode(t), 0);

    const subcategories = categories.filter(c => {
      if (selectedInsightGroup === 'Income') return c.type === 'Income';
      return c.urgency === selectedInsightGroup && c.type === 'Expense';
    }).map(c => {
      const amount = groupTransactions
        .filter(t => t.category === c.name)
        .reduce((acc, t) => acc + amountForMode(t), 0);
      return {
        name: c.name,
        amount,
        percent: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
      };
    });

    const trendData = months.map(m => {
      const monthTransactions = baseTransactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === m.year && d.getMonth() === m.monthIdx;
      });

      const targetTransactions = monthTransactions.filter(t => {
        if (selectedInsightGroup === 'Income') {
          if (t.type !== 'Income') return false;
        } else {
          if (t.type !== 'Expense' || t.urgency !== selectedInsightGroup) return false;
        }

        if (selectedSubcategory) {
          return t.category === selectedSubcategory;
        }
        return true;
      });

      const value = targetTransactions.reduce((acc, t) => acc + amountForMode(t), 0);

      return { ...m, value };
    });

    return {
      totalAmount,
      subcategories,
      trendData
    };
  }, [transactions, viewMode, selectedInsightGroup, selectedSubcategory, selectedYear, selectedMonth]);

  const insightsTransactions = useMemo(() => {
    const baseTransactions = filterByMode(transactions);

    return baseTransactions.filter(t => {
      if (selectedInsightGroup === 'Income') {
        if (t.type !== 'Income') return false;
      } else {
        if (t.type !== 'Expense' || t.urgency !== selectedInsightGroup) return false;
      }

      const d = new Date(t.date);
      const yearMatch = d.getFullYear() === selectedYear;
      const monthMatch = selectedMonth === null || d.getMonth() === selectedMonth;
      if (!yearMatch || !monthMatch) return false;

      if (selectedSubcategory) {
        return t.category === selectedSubcategory;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, viewMode, selectedInsightGroup, selectedSubcategory, selectedYear, selectedMonth]);

  // Form State
  const [type, setType] = useState<TransactionType>('Expense');
  const [isShared, setIsShared] = useState(true);
  const [urgency, setUrgency] = useState<Urgency>('Essential');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState<string>(DEFAULT_PREFS.partner_1_name);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // --- Filtered Data ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      const yearMatch = d.getFullYear() === selectedYear;
      const monthMatch = selectedMonth === null || d.getMonth() === selectedMonth;
      return yearMatch && monthMatch;
    });
  }, [transactions, selectedYear, selectedMonth]);

  // --- Calculations ---
  const businessStats = useMemo(() => {
    const businessTxs = transactions.filter(t => t.business_name === selectedBusiness);
    
    // KPIs based on global date filter
    const kpiTxs = businessTxs.filter(t => {
      const d = new Date(t.date);
      const yearMatch = d.getFullYear() === selectedYear;
      const monthMatch = selectedMonth === null || d.getMonth() === selectedMonth;
      return yearMatch && monthMatch;
    });

    const income = kpiTxs
      .filter(t => t.type === 'Income')
      .reduce((acc, t) => acc + t.amount, 0);
      
    const expenses = kpiTxs
      .filter(t => t.type === 'Expense')
      .reduce((acc, t) => acc + t.amount, 0);
      
    const margin = income > 0 ? ((income - expenses) / income) * 100 : 0;
    
    // Category Breakdown
    const breakdownTxs = businessBreakdownView === 'total' 
      ? businessTxs 
      : businessTxs.filter(t => new Date(t.date).getFullYear() === selectedYear);

    const categoryTotals: Record<string, number> = {};
    breakdownTxs
      .filter(t => t.type === 'Expense')
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });
    
    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Performance Data
    const performanceData: { label: string; income: number; expenses: number }[] = [];
    
    if (businessPerformanceView === 'monthly') {
      for (let m = 0; m < 12; m++) {
        const d = new Date(selectedYear, m, 1);
        const monthLabel = d.toLocaleString('pt-PT', { month: 'short' });
        const monthTxs = businessTxs.filter(t => {
          const td = new Date(t.date);
          return td.getMonth() === m && td.getFullYear() === selectedYear;
        });
        
        performanceData.push({
          label: monthLabel,
          income: monthTxs.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0),
          expenses: monthTxs.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0)
        });
      }
    } else {
      // Yearly: Last 3 years including selectedYear
      for (let i = 2; i >= 0; i--) {
        const year = selectedYear - i;
        const yearTxs = businessTxs.filter(t => new Date(t.date).getFullYear() === year);
        
        performanceData.push({
          label: year.toString(),
          income: yearTxs.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0),
          expenses: yearTxs.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0)
        });
      }
    }

    return {
      income,
      expenses,
      margin,
      performanceData,
      categoryBreakdown
    };
  }, [transactions, selectedBusiness, selectedYear, selectedMonth, businessPerformanceView, businessBreakdownView]);

  const stats = useMemo(() => {
    const baseTransactions = filterByMode(filteredTransactions);

    const expenses = baseTransactions.filter(t => t.type === 'Expense' && t.urgency !== 'Investment' && t.urgency !== 'Business');
    const investments = baseTransactions.filter(t => t.type === 'Expense' && t.urgency === 'Investment');
    const business = baseTransactions.filter(t => t.type === 'Expense' && t.urgency === 'Business');
    const essential = baseTransactions.filter(t => t.type === 'Expense' && t.urgency === 'Essential');
    const lifestyle = baseTransactions.filter(t => t.type === 'Expense' && t.urgency === 'Lifestyle');
    let income = baseTransactions.filter(t => t.type === 'Income');

    const totalSpent = expenses.reduce((acc, t) => acc + amountForMode(t), 0);
    const totalInvested = investments.reduce((acc, t) => acc + amountForMode(t), 0);
    const totalBusiness = business.reduce((acc, t) => acc + amountForMode(t), 0);
    const totalEssential = essential.reduce((acc, t) => acc + amountForMode(t), 0);
    const totalLifestyle = lifestyle.reduce((acc, t) => acc + amountForMode(t), 0);

    const totalIncome = income.reduce((acc, t) => acc + amountForMode(t), 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent - totalBusiness) / totalIncome) * 100 : 0;
    const investmentRate = totalIncome > 0 ? (totalInvested / totalIncome) * 100 : 0;

    return {
      totalSpent,
      totalIncome,
      totalInvested,
      totalBusiness,
      totalEssential,
      totalLifestyle,
      balance: totalIncome - totalSpent - totalBusiness,
      savingsRate,
      investmentRate
    };
  }, [filteredTransactions, viewMode]);

  // Settle-up: who fronted more of the shared expenses this period, and how
  // much the other owes to balance it out. Uses the real amount paid (not
  // halved), since this is about actual money changing hands, not "my share".
  const settleUp = useMemo(() => {
    const sharedExpenses = filteredTransactions.filter(t => t.type === 'Expense' && t.isShared && t.paid_by);
    const p1Paid = sharedExpenses.filter(t => t.paid_by === partnerNames[0]).reduce((acc, t) => acc + t.amount, 0);
    const p2Paid = sharedExpenses.filter(t => t.paid_by === partnerNames[1]).reduce((acc, t) => acc + t.amount, 0);
    const total = p1Paid + p2Paid;
    const net = p1Paid - p2Paid; // positive -> partner 1 fronted more than their fair share
    const owed = Math.abs(net) / 2;
    const uncategorizedCount = filteredTransactions.filter(t => t.type === 'Expense' && t.isShared && !t.paid_by).length;

    return {
      p1Paid,
      p2Paid,
      total,
      owed,
      whoIsOwed: net > 0 ? partnerNames[0] : net < 0 ? partnerNames[1] : null,
      whoOwes: net > 0 ? partnerNames[1] : net < 0 ? partnerNames[0] : null,
      uncategorizedCount
    };
  }, [filteredTransactions]);

  // Prioridade groups over their monthly budget, personal-mode only (a
  // household "Negócios" total isn't one person's target to hit) and only
  // meaningful against a single selected month, not "Ano Inteiro".
  const GROUP_LABELS: Record<string, string> = { Essential: 'Essencial', Lifestyle: 'Lifestyle', Business: 'Negócio', Investment: 'Investimento' };
  const budgetAlerts = useMemo(() => {
    if (viewMode !== 'personal' || selectedMonth === null) return [];
    const groupTotals: Record<string, number> = {
      Essential: stats.totalEssential,
      Lifestyle: stats.totalLifestyle,
      Business: stats.totalBusiness,
      Investment: stats.totalInvested
    };
    return (['Essential', 'Lifestyle', 'Business', 'Investment'] as const)
      .filter(urgency => budgets[urgency] && groupTotals[urgency] > (budgets[urgency] as number))
      .map(urgency => ({ name: GROUP_LABELS[urgency], spent: groupTotals[urgency], budget: budgets[urgency] as number }))
      .sort((a, b) => (b.spent - b.budget) - (a.spent - a.budget));
  }, [stats, budgets, viewMode, selectedMonth]);

  // Transaction list for the Transações view. Normally respects the Ano/Mês
  // filter like the rest of the dashboard; while actively searching, it
  // searches across ALL transactions instead (finding "that one purchase
  // from March" shouldn't require first changing the date filter to March).
  const listTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      return filterByMode(transactions)
        .filter(t => t.description.toLowerCase().includes(term) || t.category.toLowerCase().includes(term))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return filterByMode(filteredTransactions);
  }, [transactions, filteredTransactions, viewMode, searchTerm]);

  const MONTHS_PT_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Year-to-date pacing comparison: Jan through the last FULLY COMPLETED month,
  // this year vs the same window last year. This is intentionally decoupled from
  // the Mês filter chip (which is for browsing history elsewhere on the
  // dashboard) - this indicator always reflects "how am I doing so far this
  // year", based on the device's real current date.
  const ytdComparison = useMemo(() => {
    const realNow = new Date();
    const realCurrentYear = realNow.getFullYear();
    const realCurrentMonth = realNow.getMonth(); // 0-indexed

    let cutoffMonth: number;
    if (selectedYear > realCurrentYear) {
      cutoffMonth = -1; // future year selected (shouldn't normally happen) - no data
    } else if (selectedYear === realCurrentYear) {
      cutoffMonth = realCurrentMonth - 1; // last fully completed month
    } else {
      cutoffMonth = 11; // a fully-elapsed past year -> compare the whole year
    }

    const monthsElapsed = cutoffMonth + 1;

    const inYtdWindow = (t: Transaction, year: number) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() <= cutoffMonth;
    };

    const currentYtdTxs = monthsElapsed > 0 ? transactions.filter(t => inYtdWindow(t, selectedYear)) : [];
    const prevYtdTxs = monthsElapsed > 0 ? transactions.filter(t => inYtdWindow(t, selectedYear - 1)) : [];

    const getModeTotal = (txs: Transaction[]) =>
      filterByMode(txs).filter(t => t.type === 'Expense' && t.urgency !== 'Investment').reduce((acc, t) => acc + amountForMode(t), 0);

    const currentTotal = getModeTotal(currentYtdTxs);
    const prevTotal = getModeTotal(prevYtdTxs);
    const diff = currentTotal - prevTotal;
    const percent = prevTotal > 0 ? (diff / prevTotal) * 100 : 0;

    // Run-rate projection: annualize the YTD average monthly spend and compare
    // it to what was actually spent in the whole of the previous year, to
    // answer "if this trend continues, will I overshoot or save by year end?"
    const avgMonthly = monthsElapsed > 0 ? currentTotal / monthsElapsed : 0;
    const projectedFullYear = avgMonthly * 12;

    const prevFullYearTxs = transactions.filter(t => new Date(t.date).getFullYear() === selectedYear - 1);
    const prevFullYearTotal = getModeTotal(prevFullYearTxs);
    const projectedPercent = prevFullYearTotal > 0 ? ((projectedFullYear - prevFullYearTotal) / prevFullYearTotal) * 100 : 0;

    // Per-category YTD total (shared by the table below AND the "biggest
    // driver" callout) - preserves the special rule that shared Income
    // doesn't count towards an individual's personal total.
    const calcCategoryTotal = (txs: Transaction[]) => filterByMode(txs).reduce((acc, t) => {
      if (viewMode === 'personal') {
        if (t.type === 'Expense') return acc + amountForMode(t);
        if (t.type === 'Income') return acc + (t.isShared ? 0 : t.amount);
      }
      return acc + t.amount;
    }, 0);

    // Table Data - Respect yoyViewMode, now over the same YTD window
    let tableData: { category: string; type: 'Income' | 'Expense'; current: number; prev: number; percent: number }[] = [];
    if (yoyViewMode === 'main') {
      const mainCats = [
        { name: 'Essencial', urgency: 'Essential' as const },
        { name: 'Lifestyle', urgency: 'Lifestyle' as const }
      ];
      tableData = mainCats.map(catInfo => {
        const currentVal = calcCategoryTotal(currentYtdTxs.filter(t => t.urgency === catInfo.urgency && t.type === 'Expense'));
        const prevVal = calcCategoryTotal(prevYtdTxs.filter(t => t.urgency === catInfo.urgency && t.type === 'Expense'));
        const catDiff = currentVal - prevVal;
        const catPercent = prevVal > 0 ? (catDiff / prevVal) * 100 : 0;

        return {
          category: catInfo.name,
          type: 'Expense' as const,
          current: currentVal,
          prev: prevVal,
          percent: catPercent
        };
      });
    } else {
      const expenseCategories = categories.filter(c => c.type === 'Expense');
      tableData = expenseCategories.map(catInfo => {
        const cat = catInfo.name;
        const currentVal = calcCategoryTotal(currentYtdTxs.filter(t => t.category === cat));
        const prevVal = calcCategoryTotal(prevYtdTxs.filter(t => t.category === cat));
        const catDiff = currentVal - prevVal;
        const catPercent = prevVal > 0 ? (catDiff / prevVal) * 100 : 0;

        return {
          category: cat,
          type: catInfo.type,
          current: currentVal,
          prev: prevVal,
          percent: catPercent
        };
      }).filter(d => d.current > 0 || d.prev > 0).sort((a, b) => b.current - a.current);
    }

    // "Biggest driver" callout: always computed at the detailed sub-category
    // expense level (independent of the yoyViewMode toggle used for the
    // table), so it's still specific even when the table shows the
    // simplified Essencial/Lifestyle view.
    let topDriver: { category: string; diff: number } | null = null;
    if (Math.abs(diff) > 0.5) {
      const allExpenseCategories = categories.filter(c => c.type === 'Expense');
      const detailedDrivers = allExpenseCategories.map(catInfo => {
        const cat = catInfo.name;
        const currentVal = calcCategoryTotal(currentYtdTxs.filter(t => t.category === cat));
        const prevVal = calcCategoryTotal(prevYtdTxs.filter(t => t.category === cat));
        return { category: cat, diff: currentVal - prevVal };
      });

      const sorted = [...detailedDrivers].sort((a, b) => diff > 0 ? b.diff - a.diff : a.diff - b.diff);
      if (sorted[0] && Math.abs(sorted[0].diff) > 0.5) {
        topDriver = sorted[0];
      }
    }

    const periodLabel = monthsElapsed > 0
      ? (monthsElapsed === 1 ? MONTHS_PT_SHORT[0] : `${MONTHS_PT_SHORT[0]}-${MONTHS_PT_SHORT[cutoffMonth]}`)
      : '';

    return {
      percent,
      isMore: percent > 0,
      currentTotal,
      prevTotal,
      monthsElapsed,
      periodLabel,
      projectedFullYear,
      projectedPercent,
      isProjectedMore: projectedPercent > 0,
      prevFullYearTotal,
      topDriver,
      tableData
    };
  }, [transactions, selectedYear, viewMode, yoyViewMode]);

  const donutData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const baseTransactions = filterByMode(filteredTransactions);

    baseTransactions
      .filter(t => t.type === 'Expense' && t.urgency !== 'Investment')
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amountForMode(t);
      });
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ 
        name, 
        value,
        color: getCategoryColor(name)
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, viewMode]);

  const donutTotal = useMemo(() => {
    return donutData.reduce((acc, curr) => acc + curr.value, 0);
  }, [donutData]);

  const yoyData = useMemo(() => {
    const years = [selectedYear - 2, selectedYear - 1, selectedYear];
    const subCategories = categories.filter(c => c.type === 'Expense').map(c => c.name);

    return years.map(year => {
      const yearTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === year;
      });

      let expenseTransactions = yearTransactions.filter(t => t.type === 'Expense' && t.urgency !== 'Investment');
      let incomeTransactions = yearTransactions.filter(t => t.type === 'Income');
      let investmentTransactions = yearTransactions.filter(t => t.urgency === 'Investment');

      if (viewMode === 'family') {
        expenseTransactions = filterByMode(expenseTransactions);
        incomeTransactions = filterByMode(incomeTransactions);
        investmentTransactions = filterByMode(investmentTransactions);
      } else if (viewMode === 'personal') {
        incomeTransactions = incomeTransactions.filter(t => !t.isShared);
      }

      const data: any = { year: year.toString() };
      
      // Income calculation
      data.income = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);
      data.invested = investmentTransactions.reduce((acc, t) => acc + amountForMode(t), 0);

      let total = 0;
      if (yoyViewMode === 'main') {
        const essencial = expenseTransactions
          .filter(t => t.urgency === 'Essential')
          .reduce((acc, t) => acc + amountForMode(t), 0);
        const lifestyle = expenseTransactions
          .filter(t => t.urgency === 'Lifestyle')
          .reduce((acc, t) => acc + amountForMode(t), 0);
        const negocio = expenseTransactions
          .filter(t => t.urgency === 'Business')
          .reduce((acc, t) => acc + amountForMode(t), 0);
        data.Essencial = essencial;
        data.Lifestyle = lifestyle;
        data.Negócios = negocio;
        total = essencial + lifestyle + negocio;
      } else {
        subCategories.forEach(cat => {
          const val = expenseTransactions
            .filter(t => t.category === cat)
            .reduce((acc, t) => acc + amountForMode(t), 0);
          data[cat] = val;
          total += val;
        });
      }
      data.total = total;

      return data;
    });
  }, [transactions, selectedMonth, viewMode, yoyViewMode]);

  const compositionData = useMemo(() => {
    if (compositionPeriod === 'ytd') {
      const data = [];
      const endMonth = selectedMonth !== null ? selectedMonth : 11;
      
      for (let m = 0; m <= endMonth; m++) {
        const d = new Date(selectedYear, m, 1);
        const monthLabel = d.toLocaleString('pt-PT', { month: 'short' });
        
        let monthTransactions = transactions.filter(t => {
          const td = new Date(t.date);
          return td.getFullYear() === selectedYear && td.getMonth() === m && t.type === 'Expense' && t.urgency !== 'Investment';
        });

        monthTransactions = filterByMode(monthTransactions);

        const personal = monthTransactions.filter(t => !t.isShared).reduce((acc, t) => acc + t.amount, 0);
        const sharedShare = monthTransactions.filter(t => t.isShared).reduce((acc, t) => acc + amountForMode(t), 0);

        data.push({
          label: monthLabel,
          year: selectedYear,
          personal,
          sharedShare
        });
      }
      return data;
    }

    const monthsCount = compositionPeriod === '6m' ? 6 : 12;
    const data = [];
    const now = new Date(); // Real "today" - anchors the rolling 6m/12m window

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('pt-PT', { month: 'short' });
      
      let monthTransactions = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth() && t.type === 'Expense' && t.urgency !== 'Investment';
      });

      monthTransactions = filterByMode(monthTransactions);

      const personal = monthTransactions.filter(t => !t.isShared).reduce((acc, t) => acc + t.amount, 0);
      const sharedShare = monthTransactions.filter(t => t.isShared).reduce((acc, t) => acc + amountForMode(t), 0);

      data.push({
        label: monthLabel,
        year: d.getFullYear(),
        personal,
        sharedShare
      });
    }
    return data;
  }, [transactions, compositionPeriod, yoyData, selectedMonth, viewMode, selectedYear]);

  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  }, [activeView]);

  // --- Handlers ---
  const handleEditClick = (t: Transaction) => {
    setEditingTransactionId(t.id);
    setAmount(t.amount.toString().replace('.', ','));
    setType(t.type);
    setCategory(t.category);
    setDescription(t.description);
    setIsShared(t.isShared);
    setUrgency(t.urgency || 'Essential');
    setDate(new Date(t.date).toISOString().split('T')[0]);
    setPaidBy(t.paid_by || partnerNames[0]);
    if (t.business_name) {
      setSelectedBusiness(t.business_name || '');
    }
    setActiveView('add');
  };

  const cleanAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Handle strings that might have commas for decimals
    const sanitized = String(val).replace(',', '.');
    return parseFloat(sanitized) || 0;
  };

  const handleUpdateTransaction = async (id: string, updatedData: any) => {
    try {
      const amountForDB = cleanAmount(updatedData.amount);
      const { data, error } = await supabase
        .from('transactions')
        .update({
          amount: amountForDB,
          category: updatedData.category,
          description: updatedData.description,
          type: updatedData.type.toLowerCase(),
          group_type: updatedData.type === 'Income' ? 'receita' : 
                     (updatedData.urgency === 'Essential' ? 'essencial' : 
                     (updatedData.urgency === 'Investment' ? 'investimento' : 
                     (updatedData.urgency === 'Business' ? 'negocio' : 'lifestyle'))),
          isShared: updatedData.isShared,
          date: new Date(updatedData.date).toISOString(),
          business_name: (updatedData.urgency === 'Business' || (updatedData.type === 'Income' && isBusinessCategory(updatedData.category))) ? selectedBusiness : null,
          paid_by: (updatedData.type === 'Expense' && updatedData.isShared) ? paidBy : null
        })
        .eq('id', id)
        .select();

      if (error) throw error;

        if (data) {
          const updated = {
            ...data[0],
            date: new Date(data[0].date),
            type: (data[0].type === 'income' ? 'Income' : 'Expense') as TransactionType,
            urgency: (data[0].group_type === 'essencial' ? 'Essential' : 
                     (data[0].group_type === 'lifestyle' ? 'Lifestyle' : 
                     (data[0].group_type === 'investimento' ? 'Investment' : 
                     (data[0].group_type === 'negocio' ? 'Business' : null)))) as Urgency
          };
          
          setTransactions(prev => prev.map(t => t.id === id ? updated : t));
        }
    } catch (err) {
      console.error('Error updating:', err);
      alert('Erro ao atualizar a transação.');
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !session?.user) {
      alert('Por favor, preencha o valor e selecione uma categoria.');
      return;
    }

    const amountForDB = cleanAmount(amount);
    const effectiveIsShared = isDuo ? isShared : false; // solo households never have shared transactions
    const transactionData = {
      amount: amountForDB,
      type: type,
      category,
      description: description || category,
      isShared: effectiveIsShared,
      urgency: urgency,
      date: date
    };

    try {
      if (editingTransactionId) {
        await handleUpdateTransaction(editingTransactionId, transactionData);
      } else {
        const { data, error } = await supabase
          .from('transactions')
          .insert([{
            amount: amountForDB,
            type: type.toLowerCase(),
            category,
            description: description || category,
            isShared: effectiveIsShared,
            group_type: type === 'Income' ? 'receita' : 
                       (urgency === 'Essential' ? 'essencial' : 
                       (urgency === 'Investment' ? 'investimento' : 
                       (urgency === 'Business' ? 'negocio' : 'lifestyle'))),
            date: new Date(date).toISOString(),
            user_id: session.user.id,
            business_name: (urgency === 'Business' || (type === 'Income' && isBusinessCategory(category))) ? selectedBusiness : null,
            paid_by: (type === 'Expense' && isShared) ? paidBy : null
          }])
          .select();

        if (error) throw error;
        
        if (data) {
          const saved = {
            ...data[0],
            date: new Date(data[0].date),
            type: (data[0].type === 'income' ? 'Income' : 'Expense') as TransactionType,
            urgency: (data[0].group_type === 'essencial' ? 'Essential' : 
                     (data[0].group_type === 'lifestyle' ? 'Lifestyle' : 
                     (data[0].group_type === 'investimento' ? 'Investment' : 
                     (data[0].group_type === 'negocio' ? 'Business' : null)))) as Urgency
          };
          setTransactions(prev => [saved, ...prev]);
        }
      }
      resetForm();
      setActiveView('dashboard');
    } catch (err) {
      console.error('Error saving transaction:', err);
      alert('Erro ao guardar transação. Por favor, tente novamente.');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    setSingleDeleteId(id);
    setDeleteTarget('single');
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (deleteTarget === 'single' && singleDeleteId) {
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', singleDeleteId);

        if (error) throw error;
        
        // Update local state immediately (functional update ensures Insights refresh)
        setTransactions(prev => prev.filter(t => t.id !== singleDeleteId));
      } catch (err) {
        console.error('Error deleting:', err);
        alert('Erro ao eliminar a transação.');
      }
    } else if (deleteTarget === 'bulk' && selectedIds.length > 0) {
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .in('id', selectedIds);

        if (error) throw error;
        
        setTransactions(prev => prev.filter(t => !selectedIds.includes(t.id)));
        setSelectedIds([]);
        setIsSelectionMode(false);
      } catch (err) {
        console.error('Error bulk deleting:', err);
        alert('Erro ao eliminar as transações selecionadas.');
      }
    }
    setShowDeleteConfirm(false);
    setSingleDeleteId(null);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setDeleteTarget('bulk');
    setShowDeleteConfirm(true);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (ids: string[]) => {
    if (selectedIds.length === ids.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ids);
    }
  };

  const handleExportExcel = () => {
    const exportData = transactions.map(t => ({
      Data: t.date.toLocaleDateString(),
      Descrição: t.description,
      Valor: t.amount,
      Categoria: t.category,
      Tipo: t.type,
      Prioridade: t.urgency,
      Partilhado: t.isShared ? 'Sim' : 'Não'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transações");
    XLSX.writeFile(wb, `MyFinance_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    
    const canvas = await html2canvas(dashboardRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`MyFinance_Relatorio_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;

    const parseCSVDate = (dateStr: string): string => {
      const trimmed = dateStr.trim();
      try {
        // YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return new Date(trimmed).toISOString();
        
        // DD/MM/YYYY or MM/DD/YYYY
        const parts = trimmed.split(/[\/\-]/);
        if (parts.length === 3) {
          const p1 = parseInt(parts[0]);
          const p2 = parseInt(parts[1]);
          const p3 = parseInt(parts[2]);
          
          if (parts[0].length === 4) { // YYYY/MM/DD
            return new Date(p1, p2 - 1, p3).toISOString();
          }
          
          if (p1 > 12) {
            // Must be DD/MM/YYYY
            return new Date(p3, p2 - 1, p1).toISOString();
          } else if (p2 > 12) {
            // Must be MM/DD/YYYY
            return new Date(p3, p1 - 1, p2).toISOString();
          } else {
            // Ambiguous, default to DD/MM/YYYY
            return new Date(p3, p2 - 1, p1).toISOString();
          }
        }
        return new Date(trimmed).toISOString();
      } catch (err) {
        console.error("Failed to parse date:", trimmed);
        return new Date().toISOString();
      }
    };

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: async (results) => {
        const loadingToast = toast.loading('A importar transações...');
        try {
          const importedTransactions = results.data.map((row: any) => {
            // 1. Find the shared status value from any possible header name
            const rawSharedValue = (row.isShared || row.Partilhado || row.isshared || row.shared || row.is_shared || "").toString().toLowerCase().trim();
            
            // 2. Determine the actual boolean (Support 'true', 'sim', '1', 'yes')
            const booleanShared = ['true', 'sim', '1', 'yes'].includes(rawSharedValue);

            // Mapping logic as requested by user
            const transactionObject = {
              date: parseCSVDate(String(row.date || row.data || row.Date || row.Data || new Date().toISOString())),
              description: (row.description || row.Descrição || row.descrição || row.Description || row.category || row.category || 'Bulk Import').toString().trim(),
              category: (row.category || row.Categoria || row.Category || row.categoria || 'Outros').toString().trim(),
              amount: cleanAmount(row.amount || row.Valor || row.valor || row.Amount || 0),
              type: (row.type || row.Tipo || row.tipo || 'expense').toString().toLowerCase().trim() === 'income' || (row.type || row.Tipo || row.tipo || '').toString().toLowerCase().trim() === 'receita' ? 'income' : 'expense',
              group_type: (row.group_type || row.Prioridade || row.prioridade || (row.type?.toLowerCase() === 'income' ? 'receita' : 'lifestyle')).toString().toLowerCase().trim(),
              // FORCE THE BOOLEAN HERE
              isShared: booleanShared, 
              user_id: session.user.id,
              business_name: row.business_name || row.business || null
            };

            // Ensure group_type is valid for the database
            if (transactionObject.type === 'income') {
              transactionObject.group_type = 'receita';
            } else if (!['lifestyle', 'investimento', 'negocio', 'essencial'].includes(transactionObject.group_type)) {
              transactionObject.group_type = 'lifestyle';
            }

            return transactionObject;
          });

          console.log("Mapped Transaction [0]:", importedTransactions[0]);
          console.log("Final payload to insert:", importedTransactions);

          const { data, error } = await supabase
            .from('transactions')
            .insert(importedTransactions)
            .select();

          if (error) throw error;
          
          if (data) {
            const mapped = data.map(t => ({
              ...t,
              date: new Date(t.date),
              type: (t.type === 'income' ? 'Income' : 'Expense') as TransactionType,
              urgency: (t.group_type === 'essencial' ? 'Essential' : 
                 (t.group_type === 'lifestyle' ? 'Lifestyle' : 
                 (t.group_type === 'investimento' ? 'Investment' : 
                 (t.group_type === 'negocio' ? 'Business' : null)))) as Urgency
            }));
            setTransactions(prev => [...mapped, ...prev]);
            toast.success(`${data.length} transações importadas com sucesso!`, { id: loadingToast });
          }
        } catch (err: any) {
          console.error('Error importing transactions:', err);
          toast.error(`Erro na importação: ${err.message || 'Erro desconhecido'}`, { id: loadingToast });
        }
      }
    });
  };

  // --- Category/Business management (Settings) ---
  const MIN_CATEGORIES_PER_GROUP = 3;
  const MAX_CATEGORIES_PER_GROUP = 9;
  const MIN_BUSINESSES = 1;
  const MAX_BUSINESSES = 6;

  const [categoryModal, setCategoryModal] = useState<{
    mode: 'new' | 'edit';
    draft: CategoryRecord;
    groupIsBusinessList: boolean;
  } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const getCategoryGroup = (type: TransactionType, urgency: Urgency, isBusinessList: boolean) => {
    if (isBusinessList) return categories.filter(c => c.type === 'Income' && c.is_business);
    if (type === 'Income') return categories.filter(c => c.type === 'Income' && !c.is_business);
    return categories.filter(c => c.type === 'Expense' && c.urgency === urgency);
  };

  const openNewCategory = (type: TransactionType, urgency: Urgency, isBusinessList: boolean) => {
    setCategoryError(null);
    setCategoryModal({
      mode: 'new',
      groupIsBusinessList: isBusinessList,
      draft: {
        id: `new-${Date.now()}`,
        name: '',
        emoji: '⭐',
        type: isBusinessList ? 'Income' : type,
        urgency: (isBusinessList || type === 'Income') ? null : urgency,
        is_business: isBusinessList,
        sort_order: 0
      }
    });
  };

  const openEditCategory = (cat: CategoryRecord, isBusinessList: boolean) => {
    setCategoryError(null);
    setCategoryModal({ mode: 'edit', groupIsBusinessList: isBusinessList, draft: { ...cat } });
  };

  const closeCategoryModal = () => {
    setCategoryModal(null);
    setShowEmojiPicker(false);
    setCategoryError(null);
  };

  const saveCategoryDraft = async () => {
    if (!categoryModal) return;
    const { draft, mode, groupIsBusinessList } = categoryModal;
    const trimmedName = draft.name.trim();

    if (!trimmedName) {
      setCategoryError('Dá um nome à categoria.');
      return;
    }

    const nameTakenByOther = categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== draft.id);
    if (nameTakenByOther) {
      setCategoryError('Já existe uma categoria com este nome.');
      return;
    }

    const original = mode === 'edit' ? categories.find(c => c.id === draft.id) : null;
    const isRenaming = !!original && original.name !== trimmedName;
    if (isRenaming && isCategoryInUse(original!.name)) {
      setCategoryError('Não é possível renomear: já existem transações com esta categoria.');
      return;
    }

    const group = getCategoryGroup(draft.type, draft.urgency, groupIsBusinessList);
    if (mode === 'new') {
      const limit = groupIsBusinessList ? MAX_BUSINESSES : MAX_CATEGORIES_PER_GROUP;
      if (group.length >= limit) {
        setCategoryError(`Limite de ${limit} atingido para este grupo.`);
        return;
      }
    }

    setCategorySaving(true);
    try {
      if (mode === 'new') {
        const payload = {
          name: trimmedName,
          emoji: draft.emoji,
          type: draft.type,
          urgency: draft.urgency,
          is_business: draft.is_business,
          sort_order: group.length
        };
        const { data, error } = await supabase.from('categories').insert([payload]).select();
        if (error) throw error;
        if (data && data[0]) setCategories(prev => [...prev, data[0] as CategoryRecord]);
      } else {
        const { error } = await supabase
          .from('categories')
          .update({ name: trimmedName, emoji: draft.emoji })
          .eq('id', draft.id);
        if (error) throw error;
        setCategories(prev => prev.map(c => c.id === draft.id ? { ...c, name: trimmedName, emoji: draft.emoji } : c));
      }
      closeCategoryModal();
    } catch (err) {
      console.error('Error saving category:', err);
      setCategoryError('Erro ao guardar. Verifica se a tabela categories existe no Supabase (ver supabase/schema.sql).');
    } finally {
      setCategorySaving(false);
    }
  };

  const deleteCategory = async (cat: CategoryRecord, isBusinessList: boolean) => {
    if (isCategoryInUse(cat.name)) {
      toast.error('Não é possível remover: já existem transações com esta categoria.');
      return;
    }
    const group = getCategoryGroup(cat.type, cat.urgency, isBusinessList);
    const minCount = isBusinessList ? MIN_BUSINESSES : MIN_CATEGORIES_PER_GROUP;
    if (group.length <= minCount) {
      toast.error(`É necessário manter pelo menos ${minCount} ${isBusinessList ? 'negócio(s)' : 'categorias'} neste grupo.`);
      return;
    }

    try {
      const { error } = await supabase.from('categories').delete().eq('id', cat.id);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== cat.id));
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error('Erro ao remover categoria.');
    }
  };

  // Thin progress bar for a Prioridade card in Análise Detalhada - personal
  // mode only, and only meaningful for a single selected month.
  const renderBudgetBar = (urgency: 'Essential' | 'Lifestyle' | 'Investment' | 'Business', spent: number) => {
    if (viewMode !== 'personal' || selectedMonth === null) return null;
    const budget = budgets[urgency];
    if (!budget) return null;
    const pct = Math.min((spent / budget) * 100, 100);
    const overBudget = spent > budget;
    const barColor = overBudget ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500';
    return (
      <div className="w-full mt-1.5">
        <div className="h-1 bg-slate-200/70 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  // Drag-to-reorder for a category/business group: update local order
  // instantly for a smooth drag, then persist the final order to Supabase
  // once the drag finishes (not on every intermediate reorder tick).
  const reorderCategoriesLocally = (newOrder: CategoryRecord[]) => {
    const reordered = newOrder.map((cat, idx) => ({ ...cat, sort_order: idx }));
    const groupIds = new Set(reordered.map(c => c.id));
    setCategories(prev => {
      const others = prev.filter(c => !groupIds.has(c.id));
      return [...others, ...reordered];
    });
  };

  const persistCategoryOrder = async (type: TransactionType, urgency: Urgency, isBusinessList: boolean) => {
    const group = getCategoryGroup(type, urgency, isBusinessList).sort((a, b) => a.sort_order - b.sort_order);
    try {
      await Promise.all(group.map((cat, idx) =>
        supabase.from('categories').update({ sort_order: idx }).eq('id', cat.id)
      ));
    } catch (err) {
      console.error('Error saving new category order:', err);
      toast.error('Erro ao guardar nova ordem.');
    }
  };

  const renderCategoryGroupSettings = (title: string, type: TransactionType, urgency: Urgency, isBusinessList: boolean) => {
    const group = getCategoryGroup(type, urgency, isBusinessList).sort((a, b) => a.sort_order - b.sort_order);
    const maxCount = isBusinessList ? MAX_BUSINESSES : MAX_CATEGORIES_PER_GROUP;
    const minCount = isBusinessList ? MIN_BUSINESSES : MIN_CATEGORIES_PER_GROUP;

    return (
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{title}</h4>
          <span className="text-[9px] font-bold text-slate-400">{group.length}/{maxCount}</span>
        </div>
        <Reorder.Group as="div" axis="y" values={group} onReorder={reorderCategoriesLocally} className="space-y-2">
          {group.map(cat => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              inUse={isCategoryInUse(cat.name)}
              atMin={group.length <= minCount}
              onEdit={() => openEditCategory(cat, isBusinessList)}
              onDelete={() => deleteCategory(cat, isBusinessList)}
              onDragEnd={() => persistCategoryOrder(type, urgency, isBusinessList)}
            />
          ))}
        </Reorder.Group>
        <button
          type="button"
          onClick={() => openNewCategory(type, urgency, isBusinessList)}
          disabled={group.length >= maxCount}
          className={`mt-3 w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${group.length >= maxCount ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
        >
          <Plus className="w-3 h-3" /> Adicionar
        </button>
      </div>
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory('');
    setType('Expense');
    setIsShared(viewMode === 'family');
    setUrgency('Essential');
    setDate(new Date().toISOString().split('T')[0]);
    setPaidBy(partnerNames[0]);
    setEditingTransactionId(null);
  };

  const filteredCategories = categories.filter(c => {
    if (type === 'Income') return c.type === 'Income' && (businessesEnabled || !c.is_business);
    return c.type === 'Expense' && c.urgency === urgency;
  });

  if (!session) {
    return <Auth />;
  }

  const isContentView = ['dashboard', 'insights', 'list'].includes(activeView);

  return (
    <div className={`min-h-screen font-sans text-slate-900 pb-24 transition-colors duration-500 ${
      isContentView && isDuo
        ? viewMode === 'personal'
          ? 'bg-orange-50/60'
          : 'bg-teal-50/60'
        : 'bg-white'
    }`}>
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">MyFinance</h1>
            <div className="flex items-center gap-2">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                {selectedMonth !== null ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][selectedMonth] : 'Ano Inteiro'} {selectedYear}
              </p>
              {isDuo && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${
                  viewMode === 'family' ? 'bg-teal-100 text-teal-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {viewMode === 'family' ? 'Family Total' : 'Personal Share'}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 relative" ref={menuRef}>
            <button
              onClick={() => setActiveView('profile')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${activeView === 'profile' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${isFilterOpen ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
            >
              <Calendar className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-[60]"
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ano</p>
                      <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl">
                        <button 
                          onClick={() => setSelectedYear(prev => prev - 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-slate-900 transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="flex-1 text-center text-sm font-black text-slate-900">{selectedYear}</span>
                        <button 
                          disabled={selectedYear >= currentRealYear}
                          onClick={() => setSelectedYear(prev => prev + 1)}
                          className={`w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm transition-all ${selectedYear >= currentRealYear ? 'opacity-30 cursor-not-allowed' : 'text-slate-400 hover:text-slate-900'}`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mês</p>
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          onClick={() => {
                            setSelectedMonth(null);
                            setIsFilterOpen(false);
                          }}
                          className={`col-span-3 py-2 rounded-xl text-xs font-black transition-all ${selectedMonth === null ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}
                        >
                          ANO INTEIRO
                        </button>
                        {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                          <button 
                            key={m}
                            onClick={() => {
                              setSelectedMonth(i);
                              setIsFilterOpen(false);
                            }}
                            className={`py-2 rounded-xl text-[10px] font-black transition-all ${selectedMonth === i ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isMenuOpen ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-[70] overflow-hidden"
                >
                  <div className="flex flex-col">
                    <div className="relative">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          handleImportCSV(e);
                          setIsMenuOpen(false);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all">
                        <Upload className="w-4 h-4 text-slate-400" /> Importar Excel
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        handleExportExcel();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-slate-400" /> Exportar Dados
                    </button>
                    <div className="h-px bg-slate-100 my-1 mx-2" />
                    <button 
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-all"
                    >
                      <LogOut className="w-4 h-4" /> Terminar Sessão
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">A carregar dados...</p>
            </div>
          ) : (activeView === 'business' && businessesEnabled) ? (
            <motion.div
              key="business"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 pb-24"
            >
              {businessCategories.length === 0 ? (
                <div className="bg-slate-50 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-200 mt-8">
                  <Store className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold mb-1">Ainda não tens negócios.</p>
                  <p className="text-slate-400 text-xs font-bold mb-6">Adiciona um em Definições → Os Meus Negócios.</p>
                  <button
                    onClick={() => setActiveView('profile')}
                    className="px-6 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"
                  >
                    Ir para Definições
                  </button>
                </div>
              ) : (
              <>
              {/* Business Toggle */}
              <div className="bg-white rounded-3xl p-1.5 border border-slate-100 shadow-sm grid grid-cols-3 gap-1">
                {businessCategories.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBusiness(b.name)}
                    className={`py-3 px-1 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all truncate ${selectedBusiness === b.name ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    {b.emoji} {b.name}
                  </button>
                ))}
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Faturamento</p>
                  <p className="text-sm font-black text-emerald-500">€{businessStats.income.toFixed(0)}</p>
                </div>
                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Custos</p>
                  <p className="text-sm font-black text-rose-500">€{businessStats.expenses.toFixed(0)}</p>
                </div>
                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Margem</p>
                  <p className="text-sm font-black text-slate-900">{businessStats.margin.toFixed(1)}%</p>
                </div>
              </div>

              {/* Main Chart */}
              <section className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-900">Performance {businessPerformanceView === 'monthly' ? 'Mensal' : 'Anual'}</h3>
                  <div className="bg-slate-50 p-1 rounded-xl flex gap-1">
                    <button 
                      onClick={() => setBusinessPerformanceView('monthly')}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${businessPerformanceView === 'monthly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                    >
                      Mensal
                    </button>
                    <button 
                      onClick={() => setBusinessPerformanceView('yearly')}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${businessPerformanceView === 'yearly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                    >
                      Anual
                    </button>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={businessStats.performanceData} 
                      margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                      onClick={(data) => {
                        if (data && data.activeTooltipIndex !== undefined) {
                          setBusinessActiveIndex(Number(data.activeTooltipIndex));
                        } else {
                          setBusinessActiveIndex(null);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                        height={businessPerformanceView === 'monthly' ? 30 : 30}
                      />
                      {businessPerformanceView === 'monthly' && (
                        <XAxis 
                          xAxisId="year"
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          tick={(props: any) => {
                            const { x, y, index } = props;
                            if (index === 5) { // Center roughly around June
                              return (
                                <text x={x} y={y + 10} fill="#94a3b8" fontSize={9} fontWeight={500} textAnchor="middle">
                                  {selectedYear}
                                </text>
                              );
                            }
                            return null;
                          }}
                        />
                      )}
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip 
                        trigger="click"
                        active={businessActiveIndex !== null}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length && businessActiveIndex !== null) {
                            return (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBusinessActiveIndex(null);
                                }}
                                className="bg-white p-4 rounded-2xl shadow-2xl border-2 border-slate-100 cursor-pointer"
                              >
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{label}</p>
                                <div className="space-y-1">
                                  {payload.map((entry: any) => (
                                    <div key={entry.name} className="flex items-center justify-between gap-4">
                                      <span className="text-xs font-bold text-slate-500 capitalize">{entry.name === 'income' ? 'Faturamento' : 'Custos'}:</span>
                                      <span className={`text-xs font-black ${entry.name === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>€{entry.value.toFixed(0)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={businessPerformanceView === 'monthly' ? 10 : 30}>
                        {businessStats.performanceData.map((_entry, index) => (
                          <Cell 
                            key={`cell-income-${index}`} 
                            fill="#10b981" 
                            fillOpacity={businessActiveIndex === null || businessActiveIndex === index ? 1 : 0.3} 
                          />
                        ))}
                      </Bar>
                      <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={businessPerformanceView === 'monthly' ? 10 : 30}>
                        {businessStats.performanceData.map((_entry, index) => (
                          <Cell 
                            key={`cell-expenses-${index}`} 
                            fill="#f43f5e" 
                            fillOpacity={businessActiveIndex === null || businessActiveIndex === index ? 1 : 0.3} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Faturamento</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Custos</span>
                  </div>
                </div>
              </section>

              {/* Category Breakdown */}
              <section className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-900 whitespace-normal max-w-[80%]">Breakdown por Categoria</h3>
                  <div className="bg-slate-50 p-1 rounded-xl flex gap-1 flex-shrink-0">
                    <button 
                      onClick={() => setBusinessBreakdownView('total')}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${businessBreakdownView === 'total' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                    >
                      Total
                    </button>
                    <button 
                      onClick={() => setBusinessBreakdownView('yearly')}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${businessBreakdownView === 'yearly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                    >
                      Anual
                    </button>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-1/2 h-40 relative">
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total</span>
                      <span className="text-sm font-black text-slate-900">€{businessStats.expenses.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart
                        onClick={(data) => {
                          if (data && data.activeTooltipIndex !== undefined) {
                            setBusinessBreakdownActiveIndex(Number(data.activeTooltipIndex));
                          } else {
                            setBusinessBreakdownActiveIndex(null);
                          }
                        }}
                      >
                        <Pie
                          data={businessStats.categoryBreakdown}
                          innerRadius={45}
                          outerRadius={60}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          {businessStats.categoryBreakdown.map((_entry, index) => {
                            const colors = ['#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'];
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={colors[index % colors.length]} 
                                fillOpacity={businessBreakdownActiveIndex === null || businessBreakdownActiveIndex === index ? 1 : 0.3}
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip 
                          trigger="click"
                          active={businessBreakdownActiveIndex !== null}
                          formatter={(val) => `€${Number(val).toFixed(0)}`} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-2">
                    <div className="text-center mb-2">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                        {businessBreakdownView === 'yearly' ? selectedYear : 'Total'}
                      </span>
                    </div>
                    {businessStats.categoryBreakdown.length > 0 ? (
                      businessStats.categoryBreakdown.slice(0, 5).map((entry, index) => {
                        const colors = ['#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'];
                        return (
                          <div key={entry.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[index % colors.length] }} />
                              <span className="text-[10px] font-bold text-slate-500 truncate">{entry.name}</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-900">
                              €{entry.value.toFixed(0)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] font-bold text-slate-300 text-center">Sem gastos registados</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Profitability Insights */}
              <section className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="font-black">Insights de Rentabilidade</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ponto de Equilíbrio (Est.)</p>
                    <p className="text-sm font-bold">
                      {businessStats.expenses > 0 
                        ? `Precisas de €${(businessStats.expenses * 1.1).toFixed(0)} em faturamento para cobrir custos e impostos.`
                        : 'Ainda não há custos registados para este negócio.'}
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ROI Simples</p>
                    <p className="text-sm font-bold">
                      {businessStats.expenses > 0 
                        ? `O retorno sobre investimento atual é de ${((businessStats.income - businessStats.expenses) / businessStats.expenses * 100).toFixed(1)}%.`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </section>
              </>
              )}
            </motion.div>
          ) : activeView === 'profile' ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 pb-24"
            >
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm text-center">
                <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <User className="w-12 h-12 text-slate-400" />
                </div>
                <h2 className="text-xl font-black text-slate-900">{session?.user?.email}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Utilizador</p>
                
                <div className="mt-8 space-y-3">
                  <button 
                    onClick={handleLogout}
                    className="w-full py-4 rounded-2xl bg-rose-50 text-rose-500 text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Terminar Sessão
                  </button>
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Preferências</h3>
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-5">
                  {/* Household mode */}
                  <div>
                    <p className="text-xs font-black text-slate-700 mb-2">Agregado</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => savePreference({ household_mode: 'solo' })}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${!isDuo ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                      >
                        <User className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Individual</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => savePreference({ household_mode: 'duo' })}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${isDuo ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                      >
                        <Users className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Casal/Família</span>
                      </button>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed mt-2">
                      No modo Casal/Família podes marcar despesas partilhadas e dividi-las 50/50 entre duas pessoas.
                    </p>
                  </div>

                  {/* Partner names - duo only */}
                  {isDuo && (
                    <div>
                      <p className="text-xs font-black text-slate-700 mb-2">Nomes</p>
                      <div className="space-y-2">
                        <input
                          type="text"
                          defaultValue={prefs.partner_1_name}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== prefs.partner_1_name) savePreference({ partner_1_name: v });
                          }}
                          placeholder="Pessoa 1"
                          className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                        />
                        <input
                          type="text"
                          defaultValue={prefs.partner_2_name}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== prefs.partner_2_name) savePreference({ partner_2_name: v });
                          }}
                          placeholder="Pessoa 2"
                          className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                        />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 leading-relaxed mt-2">
                        Estes nomes aparecem em "Quem Pagou?" e no acerto de contas. Renomear não altera transações já registadas.
                      </p>
                    </div>
                  )}

                  {/* Businesses toggle */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-700">Negócios / Side Hustle</p>
                      <p className="text-[10px] font-bold text-slate-400 leading-relaxed mt-0.5">
                        Ativa o separador de negócios e as categorias de rendimento de negócio.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => savePreference({ businesses_enabled: !businessesEnabled })}
                      className={`relative w-12 h-7 rounded-full transition-all shrink-0 ${businessesEnabled ? 'bg-teal-500' : 'bg-slate-200'}`}
                    >
                      <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${businessesEnabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Orçamentos Mensais</h3>
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                    Estes limites só se aplicam no modo Pessoal, contra o teu total nesse grupo (Análise Detalhada e Overview).
                  </p>
                  {(['Essential', 'Lifestyle', 'Business', 'Investment'] as const).filter(u => businessesEnabled || u !== 'Business').map(urgency => (
                    <div key={urgency} className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-slate-700">{GROUP_LABELS[urgency]}</span>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs">€</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="1"
                          value={budgets[urgency] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBudgets(prev => ({ ...prev, [urgency]: val === '' ? null : Number(val) }));
                          }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            saveBudget(urgency, val === '' ? null : Number(val));
                          }}
                          placeholder="Sem limite"
                          className="w-full bg-slate-50 border-none rounded-xl py-2.5 pl-7 pr-3 text-xs font-bold text-right focus:ring-2 focus:ring-slate-900 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Categorias de Rendimento</h3>
                {renderCategoryGroupSettings('Rendimento', 'Income', null, false)}
              </div>

              {businessesEnabled && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Os Meus Negócios</h3>
                  {renderCategoryGroupSettings('Negócios', 'Income', null, true)}
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Categorias de Despesa</h3>
                <div className="space-y-3">
                  {renderCategoryGroupSettings('Essencial', 'Expense', 'Essential', false)}
                  {renderCategoryGroupSettings('Lifestyle', 'Expense', 'Lifestyle', false)}
                  {renderCategoryGroupSettings('Investimento', 'Expense', 'Investment', false)}
                  {businessesEnabled && renderCategoryGroupSettings('Negócio', 'Expense', 'Business', false)}
                </div>
              </div>
            </motion.div>
          ) : activeView === 'dashboard' && (
              <motion.div
                key="dashboard"
                ref={dashboardRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Summary Text */}
                <div className="px-2 space-y-1.5">
                  {ytdComparison.monthsElapsed > 0 ? (
                    <>
                      <p className="text-sm font-bold text-slate-500">
                        De {ytdComparison.periodLabel} de {selectedYear}, gastaste{' '}
                        <span className={ytdComparison.isMore ? 'text-rose-500' : 'text-emerald-500'}>
                          {Math.abs(ytdComparison.percent).toFixed(1)}% {ytdComparison.isMore ? 'mais' : 'menos'}
                        </span>{' '}
                        do que no mesmo período de {selectedYear - 1}{' '}
                        <span className="text-slate-400">
                          (€{ytdComparison.currentTotal.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} vs €{ytdComparison.prevTotal.toLocaleString('pt-PT', { maximumFractionDigits: 0 })})
                        </span>.
                      </p>
                      {ytdComparison.prevFullYearTotal > 0 && (
                        <p className="text-xs font-bold text-slate-400">
                          Ao ritmo atual, deves terminar {selectedYear} perto de{' '}
                          <span className={ytdComparison.isProjectedMore ? 'text-rose-500 font-black' : 'text-emerald-500 font-black'}>
                            €{ytdComparison.projectedFullYear.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}
                          </span>
                          {' '}— {ytdComparison.isProjectedMore ? 'mais' : 'menos'} {Math.abs(ytdComparison.projectedPercent).toFixed(1)}% do que os €{ytdComparison.prevFullYearTotal.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} gastos em {selectedYear - 1}.
                        </p>
                      )}
                      {ytdComparison.topDriver && (
                        <p className="text-xs font-bold text-slate-400">
                          {ytdComparison.isMore ? 'O aumento é impulsionado principalmente por' : 'A redução deve-se sobretudo a'}{' '}
                          <span className="text-slate-600 font-black">{ytdComparison.topDriver.category}</span>
                          {' '}({ytdComparison.topDriver.diff > 0 ? '+' : '-'}€{Math.abs(ytdComparison.topDriver.diff).toLocaleString('pt-PT', { maximumFractionDigits: 0 })}).
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-bold text-slate-500">
                      Ainda não há meses completos em {selectedYear} para comparar com {selectedYear - 1}.
                    </p>
                  )}
                </div>

                {viewMode === 'family' && settleUp.total > 0 && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contas Entre Vocês</p>
                      {settleUp.owed > 0.5 ? (
                        <p className="text-sm font-bold text-slate-700">
                          <span className="text-slate-900 font-black">{settleUp.whoOwes}</span> deve{' '}
                          <span className="text-slate-900 font-black">€{settleUp.owed.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span> a{' '}
                          <span className="text-slate-900 font-black">{settleUp.whoIsOwed}</span>
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-emerald-600">Contas equilibradas 🎉</p>
                      )}
                      {settleUp.uncategorizedCount > 0 && (
                        <p className="text-[10px] font-bold text-amber-500 mt-1">
                          {settleUp.uncategorizedCount} despesa(s) partilhada(s) sem "quem pagou" definido
                        </p>
                      )}
                    </div>
                    <Scale className="w-6 h-6 text-slate-300 shrink-0" />
                  </div>
                )}

                {budgetAlerts.length > 0 && (
                  <p className="px-2 text-xs font-bold text-rose-500">
                    {budgetAlerts.length === 1
                      ? `1 grupo já passou do orçamento pessoal este mês: ${budgetAlerts[0].name}.`
                      : `${budgetAlerts.length} grupos já passaram do orçamento pessoal este mês: ${budgetAlerts.map(b => b.name).join(', ')}.`}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-6">
                  {/* Summary Card */}
                  <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="relative z-10">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
                        {!isDuo ? 'Gasto Total' : viewMode === 'family' ? 'Gasto Familiar Total' : 'Meu Total Individual'}
                      </p>
                      <h2 className="text-4xl font-black mb-6">€{stats.totalSpent.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</h2>
                      
                      <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 items-center">
                        <div>
                          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-1">Total Receitas</p>
                          <p className="text-lg font-bold">€{stats.totalIncome.toLocaleString('pt-PT', { minimumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-1">Total Investido</p>
                          <p className="text-lg font-bold text-indigo-400">€{stats.totalInvested.toLocaleString('pt-PT', { minimumFractionDigits: 0 })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-1">Saldo Mensal</p>
                          <p className={`text-lg font-bold ${stats.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            €{stats.balance.toLocaleString('pt-PT', { minimumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Savings Rate Card */}
                  {viewMode === 'personal' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Taxa de Poupança</p>
                          <h3 className="text-2xl font-black text-slate-900">{stats.savingsRate.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%</h3>
                        </div>
                        <div className="relative w-14 h-14">
                          <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#042F2E" strokeWidth="12" />
                            <circle
                              cx="50" cy="50" r="40" fill="none" stroke="#2DD4BF" strokeWidth="12"
                              strokeDasharray={`${Math.max(0, Math.min(100, stats.savingsRate)) * 2.512} 251.2`}
                              strokeLinecap="round" transform="rotate(-90 50 50)"
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-[#2DD4BF]" />
                          </div>
                        </div>
                      </section>

                      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Taxa de Investimento</p>
                          <h3 className="text-2xl font-black text-slate-900">{stats.investmentRate.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%</h3>
                        </div>
                        <div className="relative w-14 h-14">
                          <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#1A1D0E" strokeWidth="12" />
                            <circle
                              cx="50" cy="50" r="40" fill="none" stroke="#6366f1" strokeWidth="12"
                              strokeDasharray={`${Math.max(0, Math.min(100, stats.investmentRate)) * 2.512} 251.2`}
                              strokeLinecap="round" transform="rotate(-90 50 50)"
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-[#6366f1]" />
                          </div>
                        </div>
                      </section>
                    </div>
                  )}
                </div>

              {/* Donut Chart */}
              <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-900 mb-6">Breakdown por Categoria</h3>
                <div className="flex items-center">
                  <div className="w-1/2 h-40 relative">
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total</span>
                      <span className="text-sm font-black text-slate-900">€{donutTotal.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart
                        onClick={(data) => {
                          if (data && data.activeTooltipIndex !== undefined) {
                            setDonutActiveIndex(Number(data.activeTooltipIndex));
                          } else {
                            setDonutActiveIndex(null);
                          }
                        }}
                      >
                        <Pie
                          data={donutData}
                          innerRadius={45}
                          outerRadius={60}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          {donutData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              fillOpacity={donutActiveIndex === null || donutActiveIndex === index ? 1 : 0.3}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          trigger="click"
                          active={donutActiveIndex !== null}
                          formatter={(val) => `€${Number(val).toFixed(0)}`} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 flex flex-col gap-2">
                    <div className="text-center mb-2">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                        {selectedMonth !== null 
                          ? `${new Date(selectedYear, selectedMonth).toLocaleString('pt-PT', { month: 'short' }).replace('.', '').charAt(0).toUpperCase() + new Date(selectedYear, selectedMonth).toLocaleString('pt-PT', { month: 'short' }).replace('.', '').slice(1)} ${selectedYear}`
                          : selectedYear}
                      </span>
                    </div>
                    {donutData.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {donutData.slice(0, 5).map((entry, index) => (
                          <div key={entry.name} className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-3 overflow-hidden min-w-0">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                              <span className="text-[10px] font-bold text-slate-500 truncate">{entry.name}</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-900 whitespace-nowrap">
                              €{entry.value.toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-slate-300 text-center">Sem dados para este período</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Stacked Area Chart - splits spend into shared vs personal, duo only */}
              {isDuo && (
              <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-900">Composição de Gastos</h3>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-teal-400" />
                        <span className="text-[10px] font-bold text-slate-400">FAMÍLIA</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-[10px] font-bold text-slate-400">PESSOAL</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex bg-slate-50 p-1 rounded-xl">
                    {(['6m', '12m', 'ytd'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCompositionPeriod(p)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${compositionPeriod === p ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                      >
                        {p === '6m' ? '6 MESES' : p === '12m' ? '12 MESES' : 'YTD'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart 
                        data={compositionData} 
                        margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
                        onClick={(data) => {
                          if (data && data.activeTooltipIndex !== undefined) {
                            setCompositionActiveIndex(Number(data.activeTooltipIndex));
                          } else {
                            setCompositionActiveIndex(null);
                          }
                        }}
                      >
                        <defs>
                          <linearGradient id="colorShared" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.shared} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={COLORS.shared} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorPersonal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.personal} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={COLORS.personal} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="label" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                          height={30}
                        />
                        <XAxis 
                          dataKey="year" 
                          axisLine={false} 
                          tickLine={false} 
                          xAxisId="year" 
                          interval={0}
                          tick={(props: any) => {
                            const { x, y, payload, index } = props;
                            const currentYear = payload.value;
                            const prevYear = index > 0 ? compositionData[index - 1].year : null;
                            if (currentYear !== prevYear) {
                              return (
                                <text x={x} y={y + 10} fill="#64748b" fontSize={10} fontWeight={900} textAnchor="start">
                                  {currentYear}
                                </text>
                              );
                            }
                            return null;
                          }}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <Tooltip 
                          trigger="click"
                          active={compositionActiveIndex !== null}
                          contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="personal" 
                          stackId="1" 
                          stroke={COLORS.personal} 
                          strokeWidth={3} 
                          fillOpacity={compositionActiveIndex === null ? 1 : 0.8} 
                          fill="url(#colorPersonal)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="sharedShare" 
                          stackId="1" 
                          stroke={COLORS.shared} 
                          strokeWidth={3} 
                          fillOpacity={compositionActiveIndex === null ? 1 : 0.8} 
                          fill="url(#colorShared)" 
                        />
                      </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
              )}

              {/* YoY Comparison Chart */}
              <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-900">Comparação YoY</h3>
                    <div className="flex bg-slate-50 p-1 rounded-xl">
                      {(['main', 'sub'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setYoyViewMode(m)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${yoyViewMode === m ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                        >
                          {m === 'main' ? 'SIMPLIFICADO' : 'SUBCATEGORIAS'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className={`grid ${viewMode === 'personal' ? 'grid-cols-2' : 'grid-cols-3'} gap-y-3 gap-x-4 px-1`}>
                    <div 
                      onClick={() => setVisibleSeries(prev => ({ ...prev, Essencial: !prev.Essencial }))}
                      className={`flex items-center gap-2 cursor-pointer transition-opacity ${visibleSeries.Essencial ? 'opacity-100' : 'opacity-30'}`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[#C2410C]" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Essencial</span>
                    </div>
                    <div 
                      onClick={() => setVisibleSeries(prev => ({ ...prev, Lifestyle: !prev.Lifestyle }))}
                      className={`flex items-center gap-2 cursor-pointer transition-opacity ${visibleSeries.Lifestyle ? 'opacity-100' : 'opacity-30'}`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Lifestyle</span>
                    </div>
                    <div 
                      onClick={() => setVisibleSeries(prev => ({ ...prev, Negócios: !prev.Negócios }))}
                      className={`flex items-center gap-2 cursor-pointer transition-opacity ${visibleSeries.Negócios ? 'opacity-100' : 'opacity-30'}`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[#475569]" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Negócios</span>
                    </div>
                    {viewMode === 'personal' && (
                      <div 
                        onClick={() => setVisibleSeries(prev => ({ ...prev, Investimentos: !prev.Investimentos }))}
                        className={`flex items-center gap-2 cursor-pointer transition-opacity ${visibleSeries.Investimentos ? 'opacity-100' : 'opacity-30'}`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Investimentos</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                      data={yoyData} 
                      margin={{ top: 20, right: 20, bottom: 20, left: -20 }}
                      onClick={(data) => {
                        if (data && data.activeTooltipIndex !== undefined) {
                          setYoyActiveIndex(Number(data.activeTooltipIndex));
                        } else {
                          setYoyActiveIndex(null);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip 
                        trigger="click"
                        active={yoyActiveIndex !== null}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length && yoyActiveIndex !== null) {
                            return (
                              <div className="bg-white p-4 rounded-2xl shadow-2xl border-2 border-slate-100">
                                <div className="flex items-center justify-between gap-4 mb-2">
                                  <p className="text-[10px] font-black text-slate-400 uppercase">{label}</p>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setYoyActiveIndex(null);
                                    }}
                                    className="-mr-1 -mt-1 p-1 text-slate-300 hover:text-slate-900 transition-colors"
                                    aria-label="Fechar"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                  {payload.map((entry: any) => {
                                    if (entry.dataKey === 'income') {
                                      if (viewMode === 'family') return null;
                                      return (
                                        <div key={entry.name} className="flex items-center justify-between gap-4">
                                          <span className="text-xs font-bold text-slate-500">Receita:</span>
                                          <span className="text-xs font-black text-emerald-500">€{entry.value.toFixed(0)}</span>
                                        </div>
                                      );
                                    }

                                    if (entry.dataKey === 'invested') {
                                      return (
                                        <div key={entry.name} className="flex items-center justify-between gap-4 border-t border-slate-50 pt-1 mt-1">
                                          <span className="text-xs font-bold text-slate-500">Investimentos:</span>
                                          <span className="text-xs font-black text-[#6366f1]">€{entry.value.toFixed(0)}</span>
                                        </div>
                                      );
                                    }
                                    
                                    const catName = entry.dataKey;
                                    const cat = categories.find(c => c.name === catName);
                                    const isShared = cat?.urgency === 'Essential' || catName === 'Essencial';
                                    
                                    return (
                                      <div key={entry.name} className="flex flex-col border-t border-slate-50 pt-1 mt-1">
                                        <div className="flex items-center justify-between gap-4">
                                          <span className="text-xs font-bold text-slate-500 capitalize">{entry.name}:</span>
                                          <span className="text-xs font-black text-slate-900">€{entry.value.toFixed(0)}</span>
                                        </div>
                                        {isDuo && viewMode === 'personal' && isShared && (
                                          <p className="text-[8px] font-bold text-slate-400 italic">
                                            Total for this category: €{entry.value.toFixed(0)} (Includes 50% of shared costs)
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {yoyViewMode === 'main' ? (
                        <>
                          <Bar dataKey="Essencial" stackId="a" fill="#C2410C" radius={[0, 0, 0, 0]} barSize={40} hide={!visibleSeries.Essencial}>
                            {yoyData.map((_entry, index) => (
                              <Cell 
                                key={`cell-essencial-${index}`} 
                                fill="#C2410C" 
                                fillOpacity={yoyActiveIndex === null || yoyActiveIndex === index ? 1 : 0.3} 
                              />
                            ))}
                          </Bar>
                          <Bar dataKey="Lifestyle" stackId="a" fill="#0D9488" radius={[0, 0, 0, 0]} barSize={40} hide={!visibleSeries.Lifestyle}>
                            {yoyData.map((_entry, index) => (
                              <Cell 
                                key={`cell-lifestyle-${index}`} 
                                fill="#0D9488" 
                                fillOpacity={yoyActiveIndex === null || yoyActiveIndex === index ? 1 : 0.3} 
                              />
                            ))}
                          </Bar>
                          <Bar dataKey="Negócios" stackId="a" fill="#475569" radius={[10, 10, 0, 0]} barSize={40} hide={!visibleSeries.Negócios}>
                            {yoyData.map((_entry, index) => (
                              <Cell 
                                key={`cell-negocios-${index}`} 
                                fill="#475569" 
                                fillOpacity={yoyActiveIndex === null || yoyActiveIndex === index ? 1 : 0.3} 
                              />
                            ))}
                          </Bar>
                        </>
                      ) : (
                        categories.filter(c => c.type === 'Expense').map((cat, i) => {
                          const color = getCategoryColor(cat.name);
                          const expenseCats = categories.filter(c => c.type === 'Expense');
                          return (
                            <Bar 
                              key={cat.name} 
                              dataKey={cat.name} 
                              stackId="a" 
                              fill={color} 
                              radius={i === expenseCats.length - 1 ? [10, 10, 0, 0] : [0, 0, 0, 0]} 
                              barSize={40} 
                              hide={
                                cat.urgency === 'Essential' ? !visibleSeries.Essencial :
                                cat.urgency === 'Lifestyle' ? !visibleSeries.Lifestyle :
                                cat.urgency === 'Business' ? !visibleSeries.Negócios :
                                cat.urgency === 'Investment' ? !visibleSeries.Investimentos :
                                false
                              }
                            >
                              {yoyData.map((_entry, index) => (
                                <Cell 
                                  key={`cell-${cat.name}-${index}`} 
                                  fill={color} 
                                  fillOpacity={yoyActiveIndex === null || yoyActiveIndex === index ? 1 : 0.3} 
                                />
                              ))}
                            </Bar>
                          );
                        })
                      )}
                      {viewMode !== 'family' && (
                        <>
                          <Line 
                            type="monotone" 
                            dataKey="income" 
                            stroke={COLORS.income} 
                            strokeWidth={4} 
                            strokeOpacity={yoyActiveIndex === null ? 1 : 0.3}
                            dot={{ 
                              r: 6, 
                              fill: COLORS.income, 
                              strokeWidth: 2, 
                              stroke: '#fff',
                              fillOpacity: yoyActiveIndex === null ? 1 : 0.3
                            }} 
                            activeDot={{ r: 8, strokeWidth: 0 }}
                            hide={!visibleSeries.income}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="invested" 
                            name="Investimentos"
                            stroke="#6366f1" 
                            strokeWidth={3} 
                            strokeOpacity={yoyActiveIndex === null ? 1 : 0.3}
                            dot={{ 
                              r: 4, 
                              fill: '#6366f1', 
                              strokeWidth: 2, 
                              stroke: '#fff',
                              fillOpacity: yoyActiveIndex === null ? 1 : 0.3
                            }} 
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            hide={!visibleSeries.Investimentos}
                          />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* YTD Variance Table */}
              <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm overflow-hidden">
                <div className="mb-6">
                  <h3 className="font-black text-slate-900">Variância YTD por Categoria</h3>
                  {ytdComparison.monthsElapsed > 0 && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {ytdComparison.periodLabel} {selectedYear} vs {ytdComparison.periodLabel} {selectedYear - 1}
                    </p>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{selectedYear}</th>
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{selectedYear - 1}</th>
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Var %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {ytdComparison.tableData.map((row) => {
                        const isIncome = row.type === 'Income';
                        const isGood = isIncome ? row.percent > 0 : row.percent < 0;
                        const isNeutral = row.percent === 0;

                        return (
                          <tr key={row.category} className="group hover:bg-slate-50 transition-colors">
                            <td className="py-3 text-xs font-bold text-slate-700">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(row.category) }} />
                                {row.category}
                              </div>
                            </td>
                            <td className="py-3 text-xs font-black text-slate-900 text-right">€{row.current.toFixed(0)}</td>
                            <td className="py-3 text-xs font-bold text-slate-400 text-right">€{row.prev.toFixed(0)}</td>
                            <td className={`py-3 text-xs font-black text-right ${
                              isNeutral ? 'text-slate-400' : isGood ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                              {row.percent > 0 ? '+' : ''}{row.percent.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </motion.div>
          )}

          {activeView === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-black">Transações</h2>
                <div className="flex gap-2">
                  {isSelectionMode && (
                    <button 
                      onClick={() => handleSelectAll(listTransactions.map(t => t.id))}
                      className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100"
                    >
                      {selectedIds.length === listTransactions.length ? 'Desmarcar Tudo' : 'Marcar Tudo'}
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setSelectedIds([]);
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSelectionMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                  >
                    {isSelectionMode ? 'Cancelar' : 'Selecionar'}
                  </button>
                  {isSelectionMode && selectedIds.length > 0 && (
                    <button 
                      onClick={handleBulkDelete}
                      className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      Eliminar ({selectedIds.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por descrição ou categoria..."
                  className="w-full bg-white border border-slate-100 rounded-2xl py-3 pl-11 pr-10 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all shadow-sm"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {listTransactions.length > 0 ? (
                  listTransactions.map((t) => {
                    const catInfo = categories.find(c => c.name === t.category);
                    const isSelected = selectedIds.includes(t.id);
                    
                    return (
                      <div 
                        key={t.id} 
                        onClick={() => isSelectionMode && toggleSelection(t.id)}
                        className={`bg-white p-4 rounded-3xl border transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-100 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {isSelectionMode && (
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-200'
                            }`}>
                              {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                          )}
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                            t.type === 'Income' ? 'bg-emerald-50 text-emerald-500' : 
                            t.urgency === 'Essential' ? 'bg-amber-50 text-amber-500' : 
                            t.urgency === 'Investment' ? 'bg-indigo-50 text-indigo-500' : 
                            t.urgency === 'Business' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-500'
                          }`}>
                            {catInfo?.emoji}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm">{t.description}</h4>
                              {isDuo && t.isShared && (
                                <span className="text-[8px] font-black bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">FAMÍLIA</span>
                              )}
                            </div>
                            <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                              {new Date(t.date).getDate()} {MONTHS_PT_SHORT[new Date(t.date).getMonth()]} {new Date(t.date).getFullYear()}
                            </p>
                          </div>
                        </div>
                          <div className="text-right flex items-center gap-2">
                            <div>
                              <p className={`font-black ${t.type === 'Income' ? 'text-emerald-500' : 'text-slate-900'}`}>
                                {t.type === 'Income' ? '+' : '-'}€{t.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              {isDuo && t.isShared && (
                                <p className="text-[9px] font-bold text-slate-400">Minha parte: €{(t.amount * 0.5).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              )}
                            </div>
                            {!isSelectionMode && (
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(t);
                                  }}
                                  className="p-2 text-slate-400 hover:text-slate-900 transition-all bg-slate-50 rounded-xl"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTransaction(t.id);
                                  }}
                                  className="p-2 text-slate-400 hover:text-rose-500 transition-all bg-slate-50 rounded-xl"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-slate-50 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">
                      {searchTerm ? 'Nenhuma transação encontrada para esta pesquisa.' : 'Nenhuma transação encontrada para este período.'}
                    </p>
                  </div>
                )}
            </motion.div>
          )}

          {activeView === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pb-24"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black">Análise Detalhada</h2>
              </div>

              {/* Analysis Summary Grid */}
              <div className="grid grid-cols-1 gap-4">
                {/* Row 1: Receitas, Essencial, Lifestyle */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setSelectedInsightGroup('Income');
                      setSelectedSubcategory(null);
                    }}
                    className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-2 ${selectedInsightGroup === 'Income' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-100 bg-white text-slate-400'}`}
                  >
                    <Banknote className="w-6 h-6" />
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase tracking-widest">Receitas</p>
                      <p className="text-xs font-black">€{stats.totalIncome.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedInsightGroup('Essential');
                      setSelectedSubcategory(null);
                    }}
                    className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-2 ${selectedInsightGroup === 'Essential' ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-slate-100 bg-white text-slate-400'}`}
                  >
                    <Home className="w-6 h-6" />
                    <div className="text-center w-full">
                      <p className="text-[8px] font-black uppercase tracking-widest">Essencial</p>
                      <p className="text-xs font-black">€{stats.totalEssential.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}</p>
                      {renderBudgetBar('Essential', stats.totalEssential)}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedInsightGroup('Lifestyle');
                      setSelectedSubcategory(null);
                    }}
                    className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-2 ${selectedInsightGroup === 'Lifestyle' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 bg-white text-slate-400'}`}
                  >
                    <Utensils className="w-6 h-6" />
                    <div className="text-center w-full">
                      <p className="text-[8px] font-black uppercase tracking-widest">Lifestyle</p>
                      <p className="text-xs font-black">€{stats.totalLifestyle.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}</p>
                      {renderBudgetBar('Lifestyle', stats.totalLifestyle)}
                    </div>
                  </button>
                </div>

                {/* Row 2: Negócios, Investimentos */}
                <div className={`grid ${businessesEnabled ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                  {businessesEnabled && (
                    <button
                      onClick={() => {
                        setSelectedInsightGroup('Business');
                        setSelectedSubcategory(null);
                      }}
                      className={`p-4 h-24 rounded-3xl border transition-all flex flex-col items-center justify-center gap-2 ${selectedInsightGroup === 'Business' ? 'border-slate-600 bg-slate-100 text-slate-700' : 'border-slate-100 bg-white text-slate-400'}`}
                    >
                      <Briefcase className="w-6 h-6" />
                      <div className="text-center w-full">
                        <p className="text-[8px] font-black uppercase tracking-widest">Negócios</p>
                        <p className="text-xs font-black">€{stats.totalBusiness.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}</p>
                        {renderBudgetBar('Business', stats.totalBusiness)}
                      </div>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedInsightGroup('Investment');
                      setSelectedSubcategory(null);
                    }}
                    className={`p-4 h-24 rounded-3xl border transition-all flex flex-col items-center justify-center gap-2 ${selectedInsightGroup === 'Investment' ? 'border-lime-600 bg-lime-50 text-lime-700' : 'border-slate-100 bg-white text-slate-400'}`}
                  >
                    <TrendingUp className="w-6 h-6" />
                    <div className="text-center w-full">
                      <p className="text-[8px] font-black uppercase tracking-widest">Investimentos</p>
                      <p className="text-xs font-black">€{stats.totalInvested.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}</p>
                      {renderBudgetBar('Investment', stats.totalInvested)}
                    </div>
                  </button>
                </div>
              </div>

              {/* Summary Table */}
              <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subcategoria</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">%</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <tr 
                      onClick={() => setSelectedSubcategory(null)}
                      className={`cursor-pointer transition-colors ${selectedSubcategory === null ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                    >
                      <td className="px-6 py-4 text-xs font-black text-slate-900">Total {selectedInsightGroup === 'Income' ? 'Receitas' : selectedInsightGroup === 'Essential' ? 'Essencial' : selectedInsightGroup === 'Lifestyle' ? 'Lifestyle' : selectedInsightGroup === 'Business' ? 'Negócios' : 'Investimentos'}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-400 text-right">100%</td>
                      <td className="px-6 py-4 text-xs font-black text-slate-900 text-right">€{insightsData.totalAmount.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}</td>
                    </tr>
                    {insightsData.subcategories.map((sub) => (
                      <tr 
                        key={sub.name}
                        onClick={() => setSelectedSubcategory(sub.name)}
                        className={`cursor-pointer transition-colors ${selectedSubcategory === sub.name ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                      >
                        <td className="px-6 py-4 text-xs font-bold text-slate-600">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(sub.name) }} />
                            {sub.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-400 text-right">{sub.percent.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}%</td>
                        <td className="px-6 py-4 text-xs font-black text-slate-900 text-right">€{sub.amount.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* Trend Chart */}
              <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="mb-6">
                  <h3 className="font-black text-slate-900">Tendência (6 Meses)</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {selectedSubcategory || `Total ${selectedInsightGroup === 'Income' ? 'Receitas' : selectedInsightGroup === 'Essential' ? 'Essencial' : selectedInsightGroup === 'Lifestyle' ? 'Lifestyle' : selectedInsightGroup === 'Business' ? 'Negócios' : 'Investimentos'}`}
                  </p>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={insightsData.trendData} 
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      onClick={(data) => {
                        if (data && data.activeTooltipIndex !== undefined) {
                          setTrendActiveIndex(Number(data.activeTooltipIndex));
                        } else {
                          setTrendActiveIndex(null);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip 
                        trigger="click"
                        active={trendActiveIndex !== null}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length && trendActiveIndex !== null) {
                            return (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTrendActiveIndex(null);
                                }}
                                className="bg-white p-4 rounded-2xl shadow-2xl border-2 border-slate-100 cursor-pointer"
                              >
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</p>
                                <p className="text-xs font-black text-slate-900">€{Number(payload[0].value ?? 0).toLocaleString('pt-PT', { maximumFractionDigits: 0 })}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={selectedInsightGroup === 'Income' ? COLORS.income : selectedInsightGroup === 'Essential' ? '#C2410C' : selectedInsightGroup === 'Lifestyle' ? '#3B82F6' : selectedInsightGroup === 'Business' ? '#475569' : '#65a30d'} 
                        strokeWidth={4} 
                        strokeOpacity={trendActiveIndex === null ? 1 : 0.3}
                        dot={{ 
                          r: 4, 
                          fill: selectedInsightGroup === 'Income' ? COLORS.income : selectedInsightGroup === 'Essential' ? '#C2410C' : selectedInsightGroup === 'Lifestyle' ? '#3B82F6' : selectedInsightGroup === 'Business' ? '#475569' : '#65a30d', 
                          strokeWidth: 2, 
                          stroke: '#fff',
                          fillOpacity: trendActiveIndex === null ? 1 : 0.3
                        }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Filtered Statements */}
              <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extrato Filtrado</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setIsSelectionMode(!isSelectionMode);
                        setSelectedIds([]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isSelectionMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                    >
                      {isSelectionMode ? 'Cancelar' : 'Selecionar'}
                    </button>
                    {isSelectionMode && selectedIds.length > 0 && (
                      <button 
                        onClick={handleBulkDelete}
                        className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        Eliminar ({selectedIds.length})
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  {insightsTransactions.length > 0 ? (
                    insightsTransactions.map((t) => {
                      const catInfo = categories.find(c => c.name === t.category);
                      const isSelected = selectedIds.includes(t.id);
                      return (
                        <div 
                          key={t.id} 
                          onClick={() => isSelectionMode && toggleSelection(t.id)}
                          className={`bg-white p-4 rounded-3xl border transition-all flex items-center justify-between group cursor-pointer ${
                            isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-100 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {isSelectionMode && (
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-200'
                              }`}>
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                            )}
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                              t.type === 'Income' ? 'bg-emerald-50 text-emerald-500' : 
                              t.urgency === 'Essential' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
                            }`}>
                              {catInfo?.emoji}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm">{t.description}</h4>
                                {isDuo && t.isShared && (
                                  <span className="text-[8px] font-black bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">FAMÍLIA</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.category}</p>
                                <span className="text-[10px] text-slate-300">•</span>
                                <p className="text-[10px] font-bold text-slate-400">{new Date(t.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-3 min-w-[140px] justify-end">
                            <div>
                              <p className={`font-black whitespace-nowrap ${t.type === 'Income' ? 'text-emerald-500' : 'text-slate-900'}`}>
                                {t.type === 'Income' ? '+' : '-'}€{amountForMode(t).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            {!isSelectionMode && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(t);
                                  }}
                                  className="p-2 text-slate-400 hover:text-slate-900 transition-all bg-slate-50 rounded-xl"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTransaction(t.id);
                                  }}
                                  className="p-2 text-slate-400 hover:text-rose-500 transition-all bg-slate-50 rounded-xl"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-slate-50 rounded-3xl p-8 text-center border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold text-sm">Nenhuma transação encontrada.</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeView === 'add' && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100"
            >
              <form onSubmit={handleAddTransaction} className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-black">{editingTransactionId ? 'Editar Entrada' : 'Nova Entrada'}</h2>
                  <button type="button" onClick={() => {
                    resetForm();
                    setActiveView('dashboard');
                  }} className="text-slate-300 hover:text-slate-900"><Trash2 className="w-5 h-5" /></button>
                </div>

                {/* Type Toggle */}
                <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setType('Income');
                      setCategory('');
                      setIsShared(viewMode === 'family');
                    }}
                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${type === 'Income' ? 'bg-white shadow-sm text-emerald-500' : 'text-slate-400'}`}
                  >
                    RECEITA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType('Expense');
                      setCategory('');
                    }}
                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${type === 'Expense' ? 'bg-white shadow-sm text-rose-500' : 'text-slate-400'}`}
                  >
                    DESPESA
                  </button>
                </div>

                {/* Owner Toggle - only relevant for duo households */}
                {isDuo && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Propriedade</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsShared(true)}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${isShared ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                      >
                        <Users className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Família 👥</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsShared(false)}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${!isShared ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                      >
                        <User className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Pessoal 👤</span>
                      </button>
                    </div>
                  </div>
                )}

                {isDuo && type === 'Expense' && isShared && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Quem Pagou?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {partnerNames.map((person) => (
                        <button
                          key={person}
                          type="button"
                          onClick={() => setPaidBy(person)}
                          className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${paidBy === person ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">{person}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {type === 'Expense' && (
                  <div className="space-y-4">
                    {/* Urgency Toggle */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Prioridade</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setUrgency('Essential')}
                          className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${urgency === 'Essential' ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                        >
                          <Home className="w-5 h-5" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-center">Essencial 🏠</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUrgency('Lifestyle')}
                          className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${urgency === 'Lifestyle' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                        >
                          <Utensils className="w-5 h-5" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-center">Lifestyle 🥂</span>
                        </button>
                        {businessesEnabled && (
                          <button
                            type="button"
                            onClick={() => {
                              setUrgency('Business');
                              const first = categories.find(c => c.type === 'Expense' && c.urgency === 'Business');
                              setCategory(first?.name || '');
                            }}
                            className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${urgency === 'Business' ? 'border-slate-600 bg-slate-50 text-slate-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                          >
                            <Briefcase className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-center">Negócios 💼</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setUrgency('Investment');
                            const first = categories.find(c => c.type === 'Expense' && c.urgency === 'Investment');
                            setCategory(first?.name || '');
                          }}
                          className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${urgency === 'Investment' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                        >
                          <TrendingUp className="w-5 h-5" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-center">Investimentos 📈</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {urgency === 'Business' && type === 'Expense' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Selecionar Negócio</label>
                    <div className="bg-slate-50 p-1.5 rounded-2xl grid grid-cols-3 gap-1">
                      {businessCategories.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBusiness(b.name)}
                          className={`py-3 px-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all truncate ${selectedBusiness === b.name ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                        >
                          {b.emoji} {b.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Categoria</label>
                  <div className="grid grid-cols-3 gap-2">
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.name)}
                        className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${category === cat.name ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                      >
                        <span className="text-base leading-none">{cat.emoji}</span>
                        <span className="text-[8px] font-bold text-center leading-tight">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Data</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Valor</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl">€</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow numbers, one comma, or one dot
                          if (val === '' || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                            setAmount(val);
                          }
                        }}
                        onBeforeInput={(e) => {
                          // Fix for iOS European keyboards: the comma (decimal) key on
                          // iOS controlled inputs doesn't always trigger onChange.
                          // Intercept at the native beforeinput level instead.
                          const data = (e.nativeEvent as InputEvent).data;
                          if (data === ',' || data === '.') {
                            e.preventDefault();
                            if (!amount.includes(',') && !amount.includes('.')) {
                              setAmount(prev => prev + ',');
                            }
                          }
                        }}
                        placeholder="0,00"
                        className="w-full bg-slate-50 border-none rounded-2xl py-5 pl-12 pr-6 text-2xl font-black focus:ring-2 focus:ring-slate-900 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Descrição</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Aluguer Abril"
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-2xl hover:bg-black transition-all active:scale-[0.98] mt-4"
                >
                  {editingTransactionId ? 'GUARDAR ALTERAÇÕES' : `ADICIONAR ${type === 'Income' ? 'RECEITA' : 'DESPESA'}`}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                  <Trash2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Confirmar Eliminação</h3>
                  <p className="text-sm font-bold text-slate-400 mt-2">
                    {deleteTarget === 'single' 
                      ? 'Tem a certeza que deseja eliminar esta transação? Esta ação não pode ser desfeita.' 
                      : `Tem a certeza que deseja eliminar as ${selectedIds.length} transações selecionadas? Esta ação não pode ser desfeita.`}
                  </p>
                </div>
                <div className="flex gap-3 w-full pt-4">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-4 rounded-2xl bg-rose-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category/Business Editor Modal */}
      <AnimatePresence>
        {categoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCategoryModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto"
            >
              {showEmojiPicker ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button type="button" onClick={() => setShowEmojiPicker(false)} className="p-2 -ml-2 text-slate-400 hover:text-slate-900">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Escolhe um Emoji</h3>
                    <div className="w-9" />
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {EMOJI_PICKER_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setCategoryModal(prev => prev ? { ...prev, draft: { ...prev.draft, emoji } } : prev);
                          setShowEmojiPicker(false);
                        }}
                        className={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${categoryModal.draft.emoji === emoji ? 'bg-slate-900' : 'bg-slate-50 hover:bg-slate-100'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <h3 className="text-xl font-black text-slate-900">
                    {categoryModal.mode === 'new'
                      ? (categoryModal.groupIsBusinessList ? 'Novo Negócio' : 'Nova Categoria')
                      : (categoryModal.groupIsBusinessList ? 'Editar Negócio' : 'Editar Categoria')}
                  </h3>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(true)}
                      className="w-16 h-16 shrink-0 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-3xl hover:bg-slate-100 transition-all"
                    >
                      {categoryModal.draft.emoji}
                    </button>
                    <input
                      type="text"
                      value={categoryModal.draft.name}
                      onChange={(e) => setCategoryModal(prev => prev ? { ...prev, draft: { ...prev.draft, name: e.target.value } } : prev)}
                      placeholder={categoryModal.groupIsBusinessList ? 'Ex: Business #1' : 'Ex: Alimentação'}
                      className="flex-1 bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  {categoryError && (
                    <p className="text-xs font-bold text-rose-500 bg-rose-50 rounded-xl p-3">{categoryError}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={closeCategoryModal}
                      className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={saveCategoryDraft}
                      disabled={categorySaving}
                      className="flex-1 py-4 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                      {categorySaving ? 'A guardar...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-4 py-5 flex justify-between items-center max-w-md mx-auto rounded-t-[2.5rem] shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)] z-50">
        <button 
          onClick={() => setActiveView('dashboard')}
          className={`transition-all ${activeView === 'dashboard' ? 'text-slate-900 scale-110' : 'text-slate-300 hover:text-slate-400'}`}
        >
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setActiveView('insights')}
          className={`transition-all ${activeView === 'insights' ? 'text-slate-900 scale-110' : 'text-slate-300 hover:text-slate-400'}`}
        >
          <BarChart3 className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setActiveView('list')}
          className={`transition-all ${activeView === 'list' ? 'text-slate-900 scale-110' : 'text-slate-300 hover:text-slate-400'}`}
        >
          <ReceiptText className="w-6 h-6" />
        </button>
        <div 
          onClick={() => {
            if (activeView === 'add') {
              resetForm();
              setActiveView('list');
            } else {
              setActiveView('add');
            }
          }}
          className={`w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center -mt-12 shadow-2xl border-4 border-white cursor-pointer transition-all active:scale-90 ${activeView === 'add' ? 'rotate-45 bg-rose-500' : ''}`}
        >
          <Plus className="w-7 h-7 text-white" />
        </div>
        {businessesEnabled && (
          <button 
            onClick={() => setActiveView('business')}
            className={`transition-all ${activeView === 'business' ? 'text-slate-900 scale-110' : 'text-slate-300 hover:text-slate-400'}`}
          >
            <Store className="w-6 h-6" />
          </button>
        )}
        {isDuo && (
          <button 
            onClick={() => setViewMode(viewMode === 'family' ? 'personal' : 'family')}
            className={`transition-all p-2.5 rounded-2xl shadow-lg border-2 transition-all ${viewMode === 'family' ? 'bg-teal-500 border-teal-400 text-white' : 'bg-amber-500 border-amber-400 text-white'}`}
          >
            {viewMode === 'family' ? <Users className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </button>
        )}
      </nav>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
          },
        }}
      />
    </div>
  );
}
