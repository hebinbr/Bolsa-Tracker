import { useState, useEffect, useCallback, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ReferenceLine
} from 'recharts';
import { 
  Search, 
  TrendingUp, 
  Activity, 
  BarChart3,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  X,
  Settings2,
  ChevronDown,
  ChevronUp,
  Bell,
  BellRing,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Newspaper,
  ExternalLink,
  Clock
} from 'lucide-react';
import { cn } from './lib/utils';
import { calculateSMA, calculateRSI } from './lib/calculations';

interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: string;
  createdAt: string;
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'alert' | 'info';
}

interface NewsItem {
  title: string;
  description: string;
  url: string;
  image?: string;
  publishedAt: string;
  source: string;
}

const BRAPI_TOKEN = 'hRNNEitB3hwbiUJePLwhgv';

const RANGES = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1A', value: '1y' },
  { label: '2A', value: '2y' },
  { label: '5A', value: '5y' },
];

const COLORS = ['#2563eb', '#10b981', '#f43f5e'];

interface StockData {
  symbol: string;
  shortName: string;
  longName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: string;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  priceEarnings?: number;
  marketCap?: number;
  dividendYield?: number;
  historicalDataPrice: {
    date: number;
    close: number;
  }[];
}

export default function App() {
  const [tickers, setTickers] = useState<string[]>(() => {
    const saved = localStorage.getItem('bolsa-tracker-tickers');
    return saved ? JSON.parse(saved) : ['PETR4'];
  });
  const [searchInput, setSearchInput] = useState('');
  const [range, setRange] = useState('1mo');
  const [stocksData, setStocksData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [indicatorSettings, setIndicatorSettings] = useState({
    showSMA: false,
    smaPeriod: 20,
    showRSI: false,
    rsiPeriod: 14
  });
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem('bolsa-tracker-alerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [alertForm, setAlertForm] = useState<{ symbol: string; targetPrice: string; condition: 'above' | 'below' } | null>(null);
  const [top10Data, setTop10Data] = useState<StockData[]>([]);
  const [top10Loading, setTop10Loading] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [sidebarSymbolInput, setSidebarSymbolInput] = useState('');

  // Perist tickers and alerts
  useEffect(() => {
    localStorage.setItem('bolsa-tracker-tickers', JSON.stringify(tickers));
  }, [tickers]);

  useEffect(() => {
    localStorage.setItem('bolsa-tracker-alerts', JSON.stringify(alerts));
  }, [alerts]);

  const fetchNews = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) {
      setNews([]);
      return;
    }
    setNewsLoading(true);
    try {
      // Brapi's news endpoint works better with one symbol or a query
      // We'll fetch for the first ticker which is usually the primary focus
      const symbol = symbols[0];
      const response = await fetch(
        `https://brapi.dev/api/news?q=${symbol}&token=${BRAPI_TOKEN}`
      );
      const result = await response.json();
      if (result.news) {
        setNews(result.news);
      }
    } catch (err) {
      console.error('Erro ao buscar notícias:', err);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  const fetchTop10 = useCallback(async () => {
    setTop10Loading(true);
    try {
      // Usando o endpoint de listagem com ordenação por volume para pegar as "maiores" (mais movimentadas)
      const response = await fetch(
        `https://brapi.dev/api/quote/list?sortBy=volume&sortOrder=desc&limit=10&token=${BRAPI_TOKEN}`
      );
      const result = await response.json();
      if (result.stocks) {
        // No endpoint de lista, os campos podem ter nomes ligeiramente diferentes ou estar em 'stocks'
        // Brapi /api/quote/list retorna { stocks: [ { stock: 'PETR4', name: 'Petrobras', close: 30.1, change: 1.2, ... } ] }
        const formattedData: StockData[] = result.stocks.map((s: any) => ({
          symbol: s.stock,
          shortName: s.name,
          longName: s.name,
          regularMarketPrice: s.close,
          regularMarketChange: s.change,
          regularMarketChangePercent: s.change, // Brapi list sometimes returns change as percent or just change
          regularMarketTime: new Date().toISOString(),
          regularMarketDayHigh: s.close, // List endpoint has limited data
          regularMarketDayLow: s.close,
          regularMarketVolume: s.volume,
          priceEarnings: s.priceEarnings,
          marketCap: s.marketCap,
          dividendYield: s.dividendYield,
          historicalDataPrice: []
        }));
        setTop10Data(formattedData);
      }
    } catch (err) {
      console.error('Erro ao buscar Top 10:', err);
    } finally {
      setTop10Loading(false);
    }
  }, []);

  const addAlert = (symbol: string, targetPrice: number, condition: 'above' | 'below') => {
    const newAlert: PriceAlert = {
      id: Math.random().toString(36).substring(2, 9),
      symbol,
      targetPrice,
      condition,
      isActive: true,
      isTriggered: false,
      createdAt: new Date().toISOString()
    };
    setAlerts(prev => [...prev, newAlert]);
    addNotification('Alerta Criado', `Notificaremos quando ${symbol} estiver ${condition === 'above' ? 'acima' : 'abaixo'} de R$ ${targetPrice.toFixed(2)}`, 'success');
    setAlertForm(null);
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const addNotification = useCallback((title: string, message: string, type: 'success' | 'alert' | 'info') => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      type
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 5));
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 5000);
  }, []);

  const checkAlerts = useCallback((data: StockData[]) => {
    setAlerts(prevAlerts => {
      let changed = false;
      const newAlerts = prevAlerts.map(alert => {
        if (!alert.isActive || alert.isTriggered) return alert;

        const stock = data.find(s => s.symbol === alert.symbol);
        if (!stock) return alert;

        const triggered = alert.condition === 'above' 
          ? stock.regularMarketPrice >= alert.targetPrice
          : stock.regularMarketPrice <= alert.targetPrice;

        if (triggered) {
          changed = true;
          addNotification(
            `Alerta de Preço: ${stock.symbol}`,
            `${stock.symbol} atingiu R$ ${stock.regularMarketPrice.toFixed(2)} (${alert.condition === 'above' ? 'acima' : 'abaixo'} de R$ ${alert.targetPrice.toFixed(2)})`,
            'alert'
          );

          // Browser notification if permitted
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(`Bolsa Tracker: ${stock.symbol}`, {
                body: `${stock.symbol} atingiu R$ ${stock.regularMarketPrice.toFixed(2)}`,
                icon: 'https://brapi.dev/favicon.ico'
              });
            } catch (e) {
              console.error('Erro ao enviar notificação nativa', e);
            }
          }

          return { ...alert, isTriggered: true, triggeredAt: new Date().toISOString() };
        }
        return alert;
      });
      return changed ? newAlerts : prevAlerts;
    });
  }, [addNotification]);

  const fetchAlertPrices = useCallback(async () => {
    const activeAlertSymbols = alerts
      .filter(a => a.isActive && !a.isTriggered)
      .map(a => a.symbol);
    
    // Also include currently tracked tickers that might not have alerts
    const allSymbols = Array.from(new Set([...tickers, ...activeAlertSymbols]));
    
    if (allSymbols.length === 0) return;

    try {
      const symbolsStr = allSymbols.join(',');
      const response = await fetch(
        `https://brapi.dev/api/quote/${symbolsStr}?token=${BRAPI_TOKEN}`
      );
      const result = await response.json();
      if (result.results) {
        checkAlerts(result.results);
      }
    } catch (err) {
      console.error('Erro ao verificar preços de alertas:', err);
    }
  }, [alerts, tickers, checkAlerts]);

  const fetchAllData = useCallback(async (symbols: string[], selectedRange: string) => {
    if (symbols.length === 0) {
      setStocksData([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const symbolsStr = symbols.join(',');
      const response = await fetch(
        `https://brapi.dev/api/quote/${symbolsStr}?range=${selectedRange}&interval=1d&token=${BRAPI_TOKEN}`
      );
      const result = await response.json();

      if (result.results && result.results.length > 0) {
        const validResults = result.results.filter((r: any) => r.regularMarketPrice !== undefined);
        if (validResults.length === 0) {
          setError('Nenhuma das ações foi encontrada.');
        }
        setStocksData(validResults);
        checkAlerts(validResults);
      } else {
        setError('Erro ao processar as ações. Verifique os códigos.');
      }
    } catch (err) {
      setError('Erro ao buscar dados. Tente novamente mais tarde.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [checkAlerts]);

  useEffect(() => {
    fetchAllData(tickers, range);
    fetchNews(tickers);
  }, [tickers, range, fetchAllData, fetchNews]);

  // Alert check interval (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAlertPrices();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchAlertPrices]);

  useEffect(() => {
    fetchTop10();
    const interval = setInterval(fetchTop10, 60000); // Atualiza a cada 1 minuto
    return () => clearInterval(interval);
  }, [fetchTop10]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const input = searchInput.trim().toUpperCase();
    if (!input) return;

    if (tickers.includes(input)) {
      setError('Esta ação já foi adicionada.');
      return;
    }

    if (tickers.length >= 3) {
      setError('Você pode comparar no máximo 3 ações.');
      return;
    }

    setTickers(prev => [...prev, input]);
    setSearchInput('');
  };

  const removeTicker = (t: string) => {
    setTickers(prev => prev.filter(item => item !== t));
  };

  // Combine historical data into a single format for Recharts
  const getChartData = () => {
    const dataMap: Record<string, any> = {};
    
    stocksData.forEach((stock) => {
      const prices = stock.historicalDataPrice?.map(d => d.close) || [];
      const smaValues = indicatorSettings.showSMA ? calculateSMA(prices, indicatorSettings.smaPeriod) : [];
      const rsiValues = indicatorSettings.showRSI ? calculateRSI(prices, indicatorSettings.rsiPeriod) : [];

      stock.historicalDataPrice?.forEach((day, idx) => {
        const dateObj = new Date(day.date * 1000);
        const dateStr = dateObj.toLocaleDateString('pt-BR', { 
          day: range === '1mo' || range === '3mo' ? '2-digit' : undefined, 
          month: '2-digit',
          year: range === '5y' || range === '2y' ? '2-digit' : undefined
        });
        const fullDate = dateObj.toLocaleDateString('pt-BR');

        if (!dataMap[fullDate]) {
          dataMap[fullDate] = { date: dateStr, fullDate };
        }
        dataMap[fullDate][stock.symbol] = day.close;
        
        // Add indicators for the primary stock (optional: could add for all, but for UI we use first)
        // Only add indicators for the FIRST stock to avoid clutter
        if (stock.symbol === tickers[0]) {
          if (indicatorSettings.showSMA) {
            dataMap[fullDate][`${stock.symbol}_SMA`] = smaValues[idx];
          }
          if (indicatorSettings.showRSI) {
            dataMap[fullDate][`${stock.symbol}_RSI`] = rsiValues[idx];
          }
        }
      });
    });

    return Object.values(dataMap).sort((a, b) => {
      const [da, ma, ya] = a.fullDate.split('/').map(Number);
      const [db, mb, yb] = b.fullDate.split('/').map(Number);
      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    });
  };

  const chartData = getChartData();

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">Bolsa Tracker</h1>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Adicionar ação (ex: PETR4, VALE3)..."
                className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl py-2 pl-10 pr-10 text-sm transition-all outline-none"
              />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={!searchInput.trim()}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>

          <button 
            onClick={() => {
              if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
              }
              setShowAlertPanel(!showAlertPanel);
            }}
            className={cn(
              "p-2 hover:bg-gray-100 rounded-full transition-colors relative",
              alerts.some(a => a.isActive && !a.isTriggered) && "text-blue-600"
            )}
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {alerts.some(a => a.isActive && !a.isTriggered) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border-2 border-white" />
            )}
          </button>

          <button 
            onClick={() => fetchAllData(tickers, range)}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-5 h-5 text-gray-600", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top 10 B3 Ribbon */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Mercado B3 (Top 10)
            </h2>
            <div className="flex items-center gap-2">
              {top10Loading && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
              <span className="text-[10px] text-gray-400 font-medium">Atualiza a cada 60s</span>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <AnimatePresence mode="popLayout">
              {top10Data.length > 0 ? (
                top10Data.map((stock) => {
                  const isPositive = stock.regularMarketChange >= 0;
                  return (
                    <motion.button
                      layout
                      key={stock.symbol}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        if (!tickers.includes(stock.symbol) && tickers.length < 3) {
                          setTickers(prev => [...prev, stock.symbol]);
                        } else if (tickers.includes(stock.symbol)) {
                          setError('Esta ação já está na comparação.');
                        } else {
                          setError('Limite de 3 ações atingido.');
                        }
                      }}
                      className="flex-shrink-0 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left min-w-[140px]"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-blue-600">{stock.symbol}</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            R$ {stock.regularMarketPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className={cn(
                          "text-[10px] font-bold flex items-center gap-0.5",
                          isPositive ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {stock.regularMarketChangePercent.toFixed(2)}%
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              ) : (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[140px] h-[82px] bg-gray-100 rounded-2xl animate-pulse" />
                ))
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Tickers List */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {tickers.map((t, idx) => (
              <div 
                key={t} 
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all animate-in fade-in zoom-in-95",
                  stocksData.some(s => s.symbol === t) ? "bg-white" : "bg-gray-100 opacity-60"
                )}
                style={{ borderLeftColor: COLORS[idx], borderLeftWidth: '4px' }}
              >
                <span className="text-sm font-bold tracking-wide">{t}</span>
                <button 
                  onClick={() => removeTicker(t)}
                  className="hover:bg-gray-100 p-0.5 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            ))}
            {tickers.length === 0 && !loading && (
              <p className="text-sm text-gray-500 font-medium italic">Nenhuma ação selecionada para comparação.</p>
            )}
          </div>

          <button 
            onClick={() => setShowTechnical(!showTechnical)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              showTechnical ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-400"
            )}
          >
            <Settings2 className="w-4 h-4" />
            Indicadores Técnicos
            {showTechnical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Technical Settings Panel */}
        {showTechnical && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="smaToggle"
                    checked={indicatorSettings.showSMA}
                    onChange={(e) => setIndicatorSettings(prev => ({ ...prev, showSMA: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="smaToggle" className="text-sm font-bold text-gray-700">Média Móvel Simples (SMA)</label>
                </div>
                {indicatorSettings.showSMA && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Período:</span>
                    <input 
                      type="number"
                      value={indicatorSettings.smaPeriod}
                      onChange={(e) => setIndicatorSettings(prev => ({ ...prev, smaPeriod: parseInt(e.target.value) || 1 }))}
                      className="w-14 px-2 py-1 text-xs border border-gray-200 rounded focus:border-blue-500 outline-none"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 italic">Exibida sobre o gráfico de preço para o ativo principal ({tickers[0]}).</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="rsiToggle"
                    checked={indicatorSettings.showRSI}
                    onChange={(e) => setIndicatorSettings(prev => ({ ...prev, showRSI: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="rsiToggle" className="text-sm font-bold text-gray-700">Índice de Força Relativa (RSI)</label>
                </div>
                {indicatorSettings.showRSI && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Período:</span>
                    <input 
                      type="number"
                      value={indicatorSettings.rsiPeriod}
                      onChange={(e) => setIndicatorSettings(prev => ({ ...prev, rsiPeriod: parseInt(e.target.value) || 1 }))}
                      className="w-14 px-2 py-1 text-xs border border-gray-200 rounded focus:border-blue-500 outline-none"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 italic">Exibido em um gráfico separado monitorando sobrecompra/sobrevenda.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {stocksData.length > 0 ? (
          <div className="space-y-6">
            {/* Chart Area */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Comparação de Desempenho</h2>
                  <p className="text-sm text-gray-500">Visualizando dados históricos lado a lado</p>
                </div>
                
                {/* Range Selector */}
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl w-fit">
                  {RANGES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRange(r.value)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                        range === r.value 
                          ? "bg-white text-blue-600 shadow-sm" 
                          : "text-gray-500 hover:text-gray-800"
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      dy={10}
                      minTickGap={30}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        padding: '12px'
                      }}
                      labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}
                      labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                      formatter={(value: number, name: string) => [`R$ ${value.toFixed(2)}`, name]}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    {stocksData.map((stock, idx) => (
                      <Line 
                        key={stock.symbol}
                        type="monotone" 
                        dataKey={stock.symbol} 
                        stroke={COLORS[idx]} 
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        animationDuration={1500}
                        name={stock.symbol}
                      />
                    ))}
                    {indicatorSettings.showSMA && stocksData.length > 0 && (
                      <Line 
                        type="monotone" 
                        dataKey={`${tickers[0]}_SMA`} 
                        stroke="#9333ea" 
                        strokeWidth={1.5}
                        strokeDasharray="5 5"
                        dot={false}
                        name={`SMA ${indicatorSettings.smaPeriod} (${tickers[0]})`}
                        animationDuration={1500}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* RSI Chart Section */}
              {indicatorSettings.showRSI && stocksData.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Oscilador RSI ({tickers[0]})</h3>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          dy={10}
                          minTickGap={30}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          domain={[0, 100]}
                          ticks={[0, 30, 70, 100]}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [value.toFixed(2), 'RSI']}
                        />
                        <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Sobrecompra', position: 'insideRight', fill: '#f43f5e', fontSize: 10 }} />
                        <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Sobrevenda', position: 'insideRight', fill: '#10b981', fontSize: 10 }} />
                        <Line 
                          type="monotone" 
                          dataKey={`${tickers[0]}_RSI`} 
                          stroke="#6366f1" 
                          strokeWidth={2}
                          dot={false}
                          name="RSI"
                          animationDuration={1500}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stocksData.map((stock, idx) => {
                const isPositive = stock.regularMarketChange >= 0;
                return (
                  <div key={stock.symbol} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col transition-transform hover:scale-[1.02]">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className="text-xs font-bold text-white px-2 py-0.5 rounded uppercase tracking-wider"
                            style={{ backgroundColor: COLORS[idx] }}
                          >
                            {stock.symbol}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">B3 S.A.</span>
                        </div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase truncate max-w-[150px]">
                          {stock.shortName}
                        </h3>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div>
                          <div className="text-xl font-black tracking-tighter">
                            R$ {stock.regularMarketPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className={cn(
                            "flex items-center justify-end gap-0.5 font-bold text-xs",
                            isPositive ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {stock.regularMarketChangePercent.toFixed(2)}%
                          </div>
                        </div>
                        <button 
                          onClick={() => setAlertForm({ symbol: stock.symbol, targetPrice: stock.regularMarketPrice.toString(), condition: 'above' })}
                          className="p-1.5 bg-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Definir alerta de preço"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Alert Form Overlay inside Card */}
                    {alertForm?.symbol === stock.symbol && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                            <BellRing className="w-3.5 h-3.5" />
                            Novo Alerta
                          </h4>
                          <button onClick={() => setAlertForm(null)}>
                            <X className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setAlertForm(prev => prev ? { ...prev, condition: 'above' } : null)}
                              className={cn(
                                "flex-1 py-1 text-[10px] font-bold rounded-md border transition-all",
                                alertForm.condition === 'above' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-200"
                              )}
                            >
                              Acima de
                            </button>
                            <button 
                              onClick={() => setAlertForm(prev => prev ? { ...prev, condition: 'below' } : null)}
                              className={cn(
                                "flex-1 py-1 text-[10px] font-bold rounded-md border transition-all",
                                alertForm.condition === 'below' ? "bg-rose-600 text-white border-rose-600" : "bg-white text-rose-600 border-rose-200"
                              )}
                            >
                              Abaixo de
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <input 
                              type="number"
                              step="0.01"
                              value={alertForm.targetPrice}
                              onChange={(e) => setAlertForm(prev => prev ? { ...prev, targetPrice: e.target.value } : null)}
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-bold"
                              placeholder="Valor alvo..."
                            />
                            <button 
                              disabled={!alertForm.targetPrice || isNaN(parseFloat(alertForm.targetPrice))}
                              onClick={() => addAlert(stock.symbol, parseFloat(alertForm.targetPrice), alertForm.condition)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-x-4 gap-y-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">P/L</span>
                          <span className="text-xs font-bold">{stock.priceEarnings ? stock.priceEarnings.toFixed(2) : '-'}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Div. Yield</span>
                          <span className="text-xs font-bold text-emerald-600">{stock.dividendYield ? `${(stock.dividendYield * 100).toFixed(2)}%` : '-'}</span>
                        </div>
                        <div className="flex flex-col col-span-2">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Vlr. de Mercado</span>
                          <span className="text-xs font-bold">
                            {stock.marketCap 
                              ? stock.marketCap >= 1e9 
                                ? `R$ ${(stock.marketCap / 1e9).toFixed(2)}B`
                                : `R$ ${(stock.marketCap / 1e6).toFixed(2)}M`
                              : '-'}
                          </span>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-50 border-dashed grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Máxima</span>
                          <span className="text-xs font-bold">R$ {stock.regularMarketDayHigh.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Mínima</span>
                          <span className="text-xs font-bold">R$ {stock.regularMarketDayLow.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Volume</span>
                          <span className="text-xs font-bold">{(stock.regularMarketVolume / 1000000).toFixed(1)}M</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Último</span>
                          <span className="text-xs font-bold text-gray-500">
                            {new Date(stock.regularMarketTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                    </div>
                  </div>
                );
              })}

              {/* Add New Placeholder */}
              {stocksData.length < 3 && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-6 text-center group cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => document.querySelector('input')?.focus()}
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="mt-2 text-sm font-bold text-gray-400 group-hover:text-blue-500">Adicionar Ação</span>
                </div>
              )}
            </div>
            
            {/* Comparison Insights */}
            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 relative overflow-hidden mb-6">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div>
                    <h3 className="text-lg font-bold mb-2">Análise de Comparação</h3>
                    <p className="text-blue-100 text-sm leading-relaxed">
                      Comparar ações do mesmo setor permite identificar outliers e oportunidades de arbitragem. Analise a correlação entre os ativos selecionados.
                    </p>
                  </div>
                  <div className="flex justify-around items-center">
                    <div className="text-center">
                       <BarChart3 className="w-10 h-10 mb-2 opacity-50 mx-auto" />
                       <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200">Volatilidade</span>
                    </div>
                    <div className="text-center">
                       <TrendingUp className="w-10 h-10 mb-2 opacity-50 mx-auto" />
                       <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200">Tendência</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-10 -top-10 bg-white/10 rounded-full w-40 h-40 blur-3xl"></div>
            </div>

            {/* News Section */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Newspaper className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Últimas Notícias</h2>
                    <p className="text-xs text-gray-400">Fique por dentro das movimentações de {tickers[0]}</p>
                  </div>
                </div>
                {newsLoading && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
              </div>

              {news.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {news.slice(0, 6).map((item, i) => (
                    <motion.a
                      key={i}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group flex flex-col bg-gray-50 rounded-2xl overflow-hidden border border-transparent hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all"
                    >
                      {item.image && (
                        <div className="aspect-video w-full overflow-hidden">
                          <img 
                            src={item.image} 
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 px-2 py-0.5 bg-blue-50 rounded">
                            {item.source}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                            <Clock className="w-3 h-3" />
                            {new Date(item.publishedAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-900 leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="mt-auto flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider group-hover:gap-2 transition-all">
                          Ler reportagem completa
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </motion.a>
                  ))}
                </div>
              ) : (
                !newsLoading && (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400 font-medium italic">Nenhuma notícia relevante encontrada no momento.</p>
                  </div>
                )
              )}
              
              {newsLoading && news.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-gray-100 rounded-2xl h-64 animate-pulse" />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          !loading && tickers.length > 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-gray-200 p-6 rounded-full mb-4 animate-pulse">
                <Activity className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Carregando ações...</h2>
              <p className="text-gray-500 max-w-xs mt-2">
                Estamos buscando as informações de {tickers.join(', ')} na B3.
              </p>
            </div>
          )
        )}
        
        {!loading && tickers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="bg-gray-100 p-6 rounded-full mb-4">
                  <Search className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Sua lista está vazia</h2>
                <p className="text-gray-500 max-w-xs mt-2">
                  Adicione até 3 códigos de ações no campo de busca para começar a comparação.
                </p>
            </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm font-bold text-gray-500 animate-pulse uppercase tracking-widest">Sincronizando Mercado...</p>
            </div>
          </div>
        )}
      </main>

      {/* Alert Management Panel */}
      {showAlertPanel && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowAlertPanel(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold">Meus Alertas</h3>
              </div>
              <button 
                onClick={() => setShowAlertPanel(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Add New Alert by Symbol in Sidebar */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Criar Alerta Rápido</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Símbolo (ex: PETR4)"
                    value={sidebarSymbolInput}
                    onChange={(e) => setSidebarSymbolInput(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:border-blue-500 outline-none uppercase font-bold"
                  />
                  <button
                    onClick={() => {
                      if (sidebarSymbolInput) {
                        setAlertForm({ symbol: sidebarSymbolInput, targetPrice: '', condition: 'above' });
                        setSidebarSymbolInput('');
                      }
                    }}
                    disabled={!sidebarSymbolInput}
                    className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Configurar Alerta
                  </button>
                </div>
              </div>

              {alertForm && !stocksData.some(s => s.symbol === alertForm.symbol) && (
                 <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 animate-in zoom-in-95">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-blue-900">{alertForm.symbol}</h4>
                      <button onClick={() => setAlertForm(null)}>
                        <X className="w-4 h-4 text-blue-400" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setAlertForm({ ...alertForm, condition: 'above' })}
                          className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg border",
                            alertForm.condition === 'above' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-200"
                          )}
                        >Acima</button>
                        <button 
                          onClick={() => setAlertForm({ ...alertForm, condition: 'below' })}
                          className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg border",
                            alertForm.condition === 'below' ? "bg-rose-600 text-white border-rose-600" : "bg-white text-rose-600 border-rose-200"
                          )}
                        >Abaixo</button>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="Preço Alvo"
                          value={alertForm.targetPrice}
                          onChange={(e) => setAlertForm({ ...alertForm, targetPrice: e.target.value })}
                          className="flex-1 px-3 py-2 text-sm rounded-xl border border-blue-200 outline-none"
                        />
                        <button 
                          disabled={!alertForm.targetPrice}
                          onClick={() => addAlert(alertForm.symbol, parseFloat(alertForm.targetPrice), alertForm.condition)}
                          className="px-4 bg-blue-600 text-white rounded-xl"
                        ><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                 </div>
              )}

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Alertas Ativos</h4>
                {alerts.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">Você ainda não definiu nenhum alerta de preço.</p>
                  </div>
                ) : (
                  alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(alert => (
                    <div 
                      key={alert.id}
                      className={cn(
                        "p-4 rounded-2xl border transition-all relative overflow-hidden",
                        alert.isTriggered 
                          ? "bg-rose-50 border-rose-100" 
                          : "bg-white border-gray-100 hover:border-blue-200"
                      )}
                    >
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-sm font-bold text-gray-900">{alert.symbol}</span>
                       <button 
                         onClick={() => removeAlert(alert.id)}
                         className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded",
                        alert.condition === 'above' ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {alert.condition === 'above' ? 'Acima' : 'Abaixo'}
                      </div>
                      <span className="text-lg font-black tracking-tighter">R$ {alert.targetPrice.toFixed(2)}</span>
                    </div>

                    {alert.isTriggered ? (
                      <div className="mt-3 flex items-center gap-1.5 text-rose-600 text-[10px] font-bold uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3" />
                        Atingido em {new Date(alert.triggeredAt!).toLocaleTimeString('pt-BR')}
                      </div>
                    ) : (
                      <div className="mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Ativo • Criado em {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100">
               <p className="text-[10px] text-gray-400 font-bold uppercase text-center leading-relaxed">
                 O aplicativo verifica os preços sempre que a página é atualizada ou os dados são recarregados.
               </p>
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-200 mt-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© 2026 Bolsa Tracker. Dados fornecidos por Brapi.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-blue-600 transition-colors">Termos</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-blue-600 transition-colors">API</a>
          </div>
        </div>
      </footer>

      {/* Notifications Toast */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.map((n) => (
            <motion.div 
              key={n.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={cn(
                "p-4 rounded-2xl shadow-2xl border w-80 pointer-events-auto backdrop-blur-sm",
                n.type === 'alert' 
                  ? "bg-rose-600 border-rose-500 text-white" 
                  : n.type === 'success'
                    ? "bg-white border-emerald-100 text-gray-900"
                    : "bg-white border-gray-100 text-gray-900"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  n.type === 'alert' ? "bg-white/20" : "bg-emerald-50"
                )}>
                  {n.type === 'alert' ? (
                    <BellRing className="w-4 h-4 text-white" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold leading-tight">{n.title}</h4>
                  <p className={cn(
                    "text-xs mt-1 leading-relaxed",
                    n.type === 'alert' ? "text-rose-100" : "text-gray-500"
                  )}>
                    {n.message}
                  </p>
                </div>
                <button 
                  onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                  className={cn(
                    "p-1 rounded-md transition-colors",
                    n.type === 'alert' ? "hover:bg-white/20 text-white/60" : "hover:bg-gray-100 text-gray-400"
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-800">{value}</span>
    </div>
  );
}
