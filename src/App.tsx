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
  ComposedChart,
  Bar,
  Cell,
  Legend,
  ReferenceLine,
  Brush
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
  Clock,
  Building
} from 'lucide-react';
import { cn } from './lib/utils';
import { calculateSMA, calculateRSI } from './lib/calculations';

interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  targetVolume?: number;
  volumeCondition?: 'above' | 'below';
  frequency: '1m' | '5m' | '15m' | '30m' | '1h';
  lastCheckedAt?: string;
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

const FAVORITE_FIIS = ['HGLG11', 'KNRI11', 'XPLG11', 'VISC11', 'MXRF11'];

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
  longBusinessSummary?: string;
  sector?: string;
  industry?: string;
  website?: string;
  logoUrl?: string;
  historicalDataPrice: {
    date: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }[];
}

export default function App() {
  const [tickers, setTickers] = useState<string[]>(() => {
    const saved = localStorage.getItem('bolsa-tracker-tickers');
    return saved ? JSON.parse(saved) : ['PETR4'];
  });
  const [searchInput, setSearchInput] = useState('');
  const [range, setRange] = useState('1mo');
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('candlestick');
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
  const [alertForm, setAlertForm] = useState<{ 
    symbol: string; 
    targetPrice: string; 
    condition: 'above' | 'below';
    targetVolume: string;
    volumeCondition: 'above' | 'below';
    frequency: '1m' | '5m' | '15m' | '30m' | '1h';
  } | null>(null);
  const [top10Data, setTop10Data] = useState<StockData[]>([]);
  const [top10Loading, setTop10Loading] = useState(false);
  const [top10Error, setTop10Error] = useState<string | null>(null);
  const [fiiRange, setFiiRange] = useState('1mo');
  const [fiiData, setFiiData] = useState<StockData[]>([]);
  const [fiiLoading, setFiiLoading] = useState(false);
  const [fiiError, setFiiError] = useState<string | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [sidebarSymbolInput, setSidebarSymbolInput] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [stockNews, setStockNews] = useState<NewsItem[]>([]);
  const [stockNewsLoading, setStockNewsLoading] = useState(false);

  // Perist tickers and alerts
  useEffect(() => {
    localStorage.setItem('bolsa-tracker-tickers', JSON.stringify(tickers));
  }, [tickers]);

  useEffect(() => {
    localStorage.setItem('bolsa-tracker-alerts', JSON.stringify(alerts));
  }, [alerts]);

  const fetchStockSpecificNews = useCallback(async (symbol: string) => {
    setStockNewsLoading(true);
    try {
      const targetUrl = `https://brapi.dev/api/news?q=${symbol}&token=${BRAPI_TOKEN}`;
      
      // Strategy 1: Direct Fetch
      try {
        const response = await fetch(targetUrl);
        if (response.ok) {
          const result = await response.json();
          if (result.news) {
            setStockNews(result.news);
            setStockNewsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn(`Direct fetch failed for ${symbol}, trying proxy...`);
      }

      // Strategy 2: Proxy Fallback (corsproxy.io)
      try {
        const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const result = await response.json();
          if (result.news) {
            setStockNews(result.news);
            setStockNewsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn(`Proxy fetch failed for ${symbol}, trying allorigins...`);
      }

      // Strategy 3: Proxy Fallback (allorigins)
      try {
        const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(allOriginsUrl);
        if (response.ok) {
          const data = await response.json();
          const result = JSON.parse(data.contents);
          if (result.news) {
            setStockNews(result.news);
            setStockNewsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error(`All strategies failed for ${symbol} news`);
      }

      setStockNews([]);
    } catch (err) {
      console.error(`Erro crítico ao buscar notícias para ${symbol}:`, err);
      setStockNews([]);
    } finally {
      setStockNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStock) {
      fetchStockSpecificNews(selectedStock.symbol);
    } else {
      setStockNews([]);
    }
  }, [selectedStock, fetchStockSpecificNews]);

  const fetchNews = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) {
      setNews([]);
      setNewsError(null);
      return;
    }
    setNewsLoading(true);
    setNewsError(null);
    
    const symbol = symbols[0];
    const targetUrl = `https://brapi.dev/api/news?q=${symbol}&token=${BRAPI_TOKEN}`;
    const targetUrlV2 = `https://brapi.dev/api/v2/news?tickers=${symbol}&token=${BRAPI_TOKEN}`;

    const urls = [targetUrl, targetUrlV2];
    let success = false;
    let fallbackUsed = false;

    // Strategy 1: Direct Fetch with fallbacks
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          if (result.news && result.news.length > 0) {
            setNews(result.news);
            success = true;
            break;
          }
        }
      } catch (err) {
        console.warn(`Direct fetch failed for ${url}, will try proxies.`);
      }
    }

    // Strategy 2: Proxy Fallback 1
    if (!success) {
      try {
        const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const result = await response.json();
          if (result.news) {
            setNews(result.news);
            success = true;
            fallbackUsed = true;
          }
        }
      } catch (err) {
        console.warn('Corsproxy failed, trying next...');
      }
    }

    // Strategy 3: Proxy Fallback 2
    if (!success) {
      try {
        const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(allOriginsUrl);
        if (response.ok) {
          const data = await response.json();
          const result = JSON.parse(data.contents);
          if (result.news) {
            setNews(result.news);
            success = true;
            fallbackUsed = true;
          }
        }
      } catch (err) {
        console.warn('Allorigins failed.');
      }
    }

    if (!success) {
      setNewsError('Não foi possível carregar as notícias devido a restrições de rede ou limite da API.');
    } else if (fallbackUsed) {
      console.log('Notícias carregadas via proxy com sucesso.');
    }
    
    setNewsLoading(false);
  }, []);

  const fetchTop10 = useCallback(async () => {
    setTop10Loading(true);
    setTop10Error(null);
    try {
      // Usando o endpoint de listagem com ordenação por volume para pegar as "maiores" (mais movimentadas)
      const response = await fetch(
        `https://brapi.dev/api/quote/list?sortBy=volume&sortOrder=desc&limit=10&token=${BRAPI_TOKEN}`
      );
      const result = await response.json();
      
      const stocksList = result.stocks || result.results || (Array.isArray(result) ? result : null);

      if (!response.ok || result.error || !stocksList) {
        let msg = result.message || `Erro na API (Status: ${response.status})`;
        if (response.status === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('limit')) {
          msg = 'Limite de requisições atingido. Tente novamente em alguns minutos.';
        }
        console.error('API Error (Top10):', msg);
        setTop10Error(msg);
        setTop10Data([]);
        return;
      }

      if (stocksList) {
        // No endpoint de lista, os campos podem ter nomes ligeiramente diferentes ou estar em 'stocks'
        const formattedData: StockData[] = stocksList.map((s: any) => ({
          symbol: s.stock || s.symbol || '',
          shortName: s.name || s.shortName || s.longName || '',
          longName: s.name || s.longName || s.shortName || '',
          regularMarketPrice: s.close || s.regularMarketPrice || 0,
          regularMarketChange: s.change || s.regularMarketChange || 0,
          regularMarketChangePercent: s.change || s.regularMarketChangePercent || 0,
          regularMarketTime: new Date().toISOString(),
          regularMarketDayHigh: s.close || s.regularMarketDayHigh || 0,
          regularMarketDayLow: s.close || s.regularMarketDayLow || 0,
          regularMarketVolume: s.volume || s.regularMarketVolume || 0,
          priceEarnings: s.priceEarnings,
          marketCap: s.marketCap,
          dividendYield: s.dividendYield,
          historicalDataPrice: []
        }));
        setTop10Data(formattedData.filter(s => s.symbol !== ''));
      } else {
        setTop10Data([]);
      }
    } catch (err) {
      console.error('Erro ao buscar Top 10:', err);
      setTop10Error('Ocorreu um erro ao conectar com o servidor.');
      setTop10Data([]);
    } finally {
      setTop10Loading(false);
    }
  }, []);

  const fetchFiiData = useCallback(async (selectedRange: string) => {
    setFiiLoading(true);
    setFiiError(null);
    try {
      const symbolsStr = FAVORITE_FIIS.join(',');
      const response = await fetch(
        `https://brapi.dev/api/quote/${symbolsStr}?range=${selectedRange}&interval=1d&token=${BRAPI_TOKEN}`
      );
      const result = await response.json();
      if (!response.ok || result.error || !result.results) {
        let msg = result.message || `Erro na API (Status: ${response.status})`;
        if (response.status === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('limit')) {
          msg = 'Limite atingido. Tente em instantes.';
        }
        console.error('API Error (FIIs):', msg);
        setFiiError(msg);
        return;
      }
      if (result.results) {
        setFiiData(result.results);
      }
    } catch (err) {
      console.error('Erro ao buscar FIIs:', err);
      setFiiError('Erro de conexão.');
    } finally {
      setFiiLoading(false);
    }
  }, []);

  const addAlert = (
    symbol: string, 
    targetPrice: number, 
    condition: 'above' | 'below', 
    targetVolume?: number, 
    volumeCondition?: 'above' | 'below',
    frequency: '1m' | '5m' | '15m' | '30m' | '1h' = '1m'
  ) => {
    const newAlert: PriceAlert = {
      id: Math.random().toString(36).substring(2, 9),
      symbol,
      targetPrice,
      condition,
      targetVolume,
      volumeCondition,
      frequency,
      isActive: true,
      isTriggered: false,
      createdAt: new Date().toISOString()
    };
    setAlerts(prev => [...prev, newAlert]);
    
    let msg = `Notificaremos quando ${symbol} estiver ${condition === 'above' ? 'acima' : 'abaixo'} de R$ ${targetPrice.toFixed(2)}`;
    if (targetVolume) {
      msg += ` E volume estiver ${volumeCondition === 'above' ? 'acima' : 'abaixo'} de ${targetVolume.toLocaleString()}`;
    }
    
    addNotification('Alerta Criado', msg, 'success');
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
      const now = new Date();
      
      const newAlerts = prevAlerts.map(alert => {
        if (!alert.isActive || alert.isTriggered) return alert;

        // Frequency Check
        if (alert.lastCheckedAt) {
          const lastCheck = new Date(alert.lastCheckedAt);
          const diffMs = now.getTime() - lastCheck.getTime();
          const freqMapMins: Record<string, number> = { '1m': 1, '5m': 5, '15m': 15, '30m': 30, '1h': 60 };
          const minMs = (freqMapMins[alert.frequency] || 1) * 60 * 1000;
          if (diffMs < minMs) return alert;
        }

        const stock = data.find(s => s.symbol === alert.symbol);
        if (!stock) return alert;

        // Price Condition
        const priceTriggered = alert.condition === 'above' 
          ? stock.regularMarketPrice >= alert.targetPrice
          : stock.regularMarketPrice <= alert.targetPrice;

        // Volume Condition (optional)
        let volumeTriggered = true;
        if (alert.targetVolume !== undefined && alert.volumeCondition) {
          volumeTriggered = alert.volumeCondition === 'above'
            ? (stock.regularMarketVolume || 0) >= alert.targetVolume
            : (stock.regularMarketVolume || 0) <= alert.targetVolume;
        }

        const triggered = priceTriggered && volumeTriggered;

        if (triggered) {
          changed = true;
          let condStr = `${stock.symbol} atingiu R$ ${stock.regularMarketPrice.toFixed(2)} (${alert.condition === 'above' ? 'acima' : 'abaixo'} de R$ ${alert.targetPrice.toFixed(2)})`;
          if (alert.targetVolume) {
            condStr += ` e volume de ${(stock.regularMarketVolume / 1e6).toFixed(1)}M (${alert.volumeCondition === 'above' ? 'acima' : 'abaixo'} de ${(alert.targetVolume / 1e6).toFixed(1)}M)`;
          }

          addNotification(
            `Alerta de Preço: ${stock.symbol}`,
            condStr,
            'alert'
          );

          // Browser notification if permitted
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(`Bolsa Tracker: ${stock.symbol}`, {
                body: condStr,
                icon: 'https://brapi.dev/favicon.ico'
              });
            } catch (e) {
              console.error('Erro ao enviar notificação nativa', e);
            }
          }

          return { ...alert, isTriggered: true, triggeredAt: now.toISOString(), lastCheckedAt: now.toISOString() };
        }
        
        // If not triggered, update last checked time
        changed = true;
        return { ...alert, lastCheckedAt: now.toISOString() };
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
        `https://brapi.dev/api/quote/${symbolsStr}?range=${selectedRange}&interval=1d&token=${BRAPI_TOKEN}&fundamental=true`
      );
      const result = await response.json();

      if (!response.ok || result.error || result.message) {
        let msg = result.message || `Erro na API do Brapi (Status: ${response.status})`;
        if (response.status === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('limit')) {
          msg = 'Limite de requisições da API atingido. Tente novamente em alguns minutos.';
        }
        setError(msg);
        return;
      }

      if (result.results && result.results.length > 0) {
        const validResults = result.results.filter((r: any) => r.regularMarketPrice !== undefined);
        const invalidResults = result.results.filter((r: any) => r.error === true);
        
        if (invalidResults.length > 0) {
          console.warn('Alguns ativos não foram encontrados:', invalidResults.map((r: any) => r.symbol).join(', '));
        }

        if (validResults.length === 0) {
          setError('Nenhum dos ativos informados foi encontrado.');
        }
        setStocksData(validResults);
        checkAlerts(validResults);
      } else {
        setError('Ocorreu um erro ao processar os dados dos ativos.');
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
    fetchFiiData(fiiRange);
    const interval = setInterval(() => {
      fetchTop10();
      fetchFiiData(fiiRange);
    }, 60000); // Atualiza a cada 1 minuto
    return () => clearInterval(interval);
  }, [fetchTop10, fetchFiiData, fiiRange]);

  const openDetails = useCallback((symbol: string) => {
    const stock = stocksData.find(s => s.symbol === symbol) || 
                  top10Data.find(s => s.symbol === symbol) ||
                  fiiData.find(s => s.symbol === symbol);
    if (stock) {
      setSelectedStock(stock);
    }
  }, [stocksData, top10Data, fiiData]);

  const addToComparison = useCallback((symbol: string) => {
    if (!tickers.includes(symbol) && tickers.length < 3) {
      setTickers(prev => [...prev, symbol]);
      return true;
    } else if (tickers.includes(symbol)) {
      setError('Esta ação já está na comparação.');
      return false;
    } else {
      setError('Limite de 3 ações atingido.');
      return false;
    }
  }, [tickers]);

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
        dataMap[fullDate][`${stock.symbol}_OHLC`] = {
          open: day.open,
          high: day.high,
          low: day.low,
          close: day.close,
          isPositive: day.close >= day.open
        };
        
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
                placeholder="Ativos (ex: PETR4, HGLG11, VALE3)..."
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
              Mercado B3 (Mais Negociadas)
            </h2>
            <div className="flex items-center gap-2">
              {top10Loading && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
              <span className="text-[10px] text-gray-400 font-medium">Atualiza a cada 60s</span>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <AnimatePresence mode="popLayout">
              {top10Error ? (
                <div className="flex-shrink-0 w-full bg-white border border-red-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase">
                    <AlertCircle className="w-4 h-4" />
                    Erro ao carregar
                  </div>
                  <p className="text-[10px] text-gray-500 max-w-[200px]">{top10Error}</p>
                  <button 
                    onClick={() => fetchTop10()}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-3 h-3" /> Tentar Novamente
                  </button>
                </div>
              ) : top10Loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[160px] h-[94px] bg-white border border-gray-100 rounded-2xl animate-pulse" />
                ))
              ) : top10Data.length > 0 ? (
                top10Data.map((stock) => {
                  const isPositive = stock.regularMarketChange >= 0;
                  const isTracked = tickers.includes(stock.symbol);
                  return (
                    <motion.div
                      layout
                      key={stock.symbol}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex-shrink-0 bg-white border rounded-2xl p-4 shadow-sm transition-all text-left min-w-[160px] relative group/top",
                        isTracked ? "border-blue-400 ring-2 ring-blue-50" : "border-gray-100 hover:border-blue-200 hover:shadow-md"
                      )}
                    >
                      <button 
                        onClick={() => addToComparison(stock.symbol)}
                        className="flex flex-col gap-1 w-full"
                      >
                        <span className="text-xs font-black text-blue-600 uppercase tracking-tighter">{stock.symbol}</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-black text-gray-900 tracking-tighter">
                            R$ {stock.regularMarketPrice.toFixed(2)}
                          </span>
                        </div>
                        {stock.regularMarketVolume && (
                          <div className="text-[9px] font-black text-gray-400 uppercase tracking-tight flex items-center gap-1 opacity-60">
                             Vol: {(stock.regularMarketVolume / 1e6).toFixed(1)}M
                          </div>
                        )}
                        <div className={cn(
                          "text-[10px] font-black flex items-center gap-0.5 mt-0.5",
                          isPositive ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {stock.regularMarketChangePercent.toFixed(2)}%
                        </div>
                      </button>
                      <button 
                        onClick={() => setSelectedStock(stock)}
                        className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover/top:opacity-100"
                        title="Ver detalhes"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex-shrink-0 w-full bg-white border border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center h-[94px]">
                  <p className="text-[10px] text-gray-400 font-medium">Nenhum dado das mais negociadas disponível no momento.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* FIIs Ribbon */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Fundos Imobiliários (FIIs)
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                {RANGES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setFiiRange(r.value)}
                    className={cn(
                      "px-2 py-1 text-[10px] font-black rounded-md transition-all",
                      fiiRange === r.value 
                        ? "bg-white text-blue-600 shadow-sm" 
                        : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                {fiiLoading && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
                <span className="text-[10px] text-gray-400 font-medium">Atualiza a cada 60s</span>
              </div>
            </div>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <AnimatePresence mode="popLayout">
              {fiiError ? (
                <div className="flex-shrink-0 w-full bg-white border border-red-100 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center min-h-[210px]">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                  <p className="text-xs font-bold text-gray-700">{fiiError}</p>
                  <button 
                    onClick={() => fetchFiiData(fiiRange)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-blue-700 transition-all"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : fiiLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[300px] h-[210px] bg-white border border-gray-100 rounded-2xl animate-pulse" />
                ))
              ) : fiiData.length > 0 ? (
                fiiData.map((stock) => {
                  const isPositive = stock.regularMarketChange >= 0;
                  const isTracked = tickers.includes(stock.symbol);
                  
                  // Prepare chart data for this specific FII
                  const fiiChartData = stock.historicalDataPrice?.map(d => {
                    const isPos = d.close >= d.open;
                    return {
                      date: new Date(d.date * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                      open: d.open,
                      close: d.close,
                      high: d.high,
                      low: d.low,
                      isPositive: isPos,
                      wick: [d.low, d.high],
                      body: [d.open, d.close]
                    };
                  }) || [];

                  return (
                    <motion.div
                      layout
                      key={stock.symbol}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex-shrink-0 bg-white border rounded-2xl p-4 shadow-sm transition-all text-left min-w-[300px] relative group/top",
                        isTracked ? "border-blue-400 ring-4 ring-blue-50" : "border-gray-100 hover:border-blue-200 hover:shadow-lg"
                      )}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <button 
                          onClick={() => addToComparison(stock.symbol)}
                          className="flex flex-col gap-0.5 text-left"
                        >
                          <span className="text-xs font-black text-blue-600 uppercase tracking-tighter">{stock.symbol}</span>
                          <span className="text-lg font-black text-gray-900 tracking-tighter">
                            R$ {stock.regularMarketPrice.toFixed(2)}
                          </span>
                          <div className={cn(
                            "text-[10px] font-black flex items-center gap-0.5",
                            isPositive ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {stock.regularMarketChangePercent.toFixed(2)}%
                          </div>
                        </button>
                        <button 
                          onClick={() => setSelectedStock(stock)}
                          className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                          title="Ver detalhes"
                        >
                          <AlertCircle className="w-5 h-5" />
                        </button>
                      </div>
                      
                      {/* FII Mini Chart (Candlestick) */}
                      <div className="h-32 w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={fiiChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FAFAFA" />
                            <XAxis dataKey="date" hide />
                            <YAxis domain={['auto', 'auto']} hide />
                            <Tooltip 
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                              labelStyle={{ display: 'none' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d = payload[0].payload;
                                  return (
                                    <div className="bg-white p-2 rounded shadow border border-gray-100 text-[10px] font-bold">
                                      <p className="border-b mb-1 pb-1">{d.date}</p>
                                      <p>O: {d.open.toFixed(2)}</p>
                                      <p>H: {d.high.toFixed(2)}</p>
                                      <p>L: {d.low.toFixed(2)}</p>
                                      <p>C: {d.close.toFixed(2)}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            {/* Wick */}
                            <Bar dataKey="wick" fill="#000" barSize={1.5}>
                              {fiiChartData.map((entry, index) => (
                                <Cell key={`wick-${index}`} fill={entry.isPositive ? '#10b981' : '#f43f5e'} />
                              ))}
                            </Bar>
                            {/* Body */}
                            <Bar dataKey="body" barSize={8}>
                              {fiiChartData.map((entry, index) => (
                                <Cell key={`body-${index}`} fill={entry.isPositive ? '#10b981' : '#f43f5e'} />
                              ))}
                            </Bar>
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex-shrink-0 w-full bg-white border border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center min-h-[210px]">
                  <p className="text-[10px] text-gray-400 font-medium">Nenhum dado de FIIs disponível no momento.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Tickers List */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-3">
            {tickers.map((t, idx) => (
              <div 
                key={t} 
                className="flex items-center bg-[#E5E7EB] rounded-xl h-11 border border-gray-300 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 group transition-all hover:border-blue-400"
              >
                <div 
                  className="w-1.5 h-full rounded-r-sm mr-3 transition-colors" 
                  style={{ backgroundColor: COLORS[idx] }}
                />
                <button 
                  onClick={() => openDetails(t)}
                  className="text-sm font-black tracking-tight text-gray-900 hover:text-blue-600 transition-colors uppercase pr-2"
                >
                  {t}
                </button>
                <button 
                  onClick={() => removeTicker(t)}
                  className="p-1 hover:bg-gray-300 rounded-full transition-colors mr-2"
                >
                  <X className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
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
              "flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-sm ring-1 ring-gray-200",
              showTechnical ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-gray-700 hover:bg-gray-50 hover:ring-blue-300"
            )}
          >
            <Settings2 className="w-4.5 h-4.5" />
            <span>Indicadores Técnicos</span>
            {showTechnical ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
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
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button 
              onClick={() => fetchAllData(tickers, range)}
              className="px-3 py-1 bg-white border border-red-200 rounded-lg text-[10px] font-black uppercase hover:bg-red-100 transition-colors shadow-sm whitespace-nowrap"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {stocksData.length > 0 ? (
          <div className="space-y-6">
            {/* Chart Area */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Análise de Mercado</h2>
                    <p className="text-sm text-gray-500">Visualizando dados históricos e tendências</p>
                  </div>
                  <div className="hidden lg:flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                    <button
                      onClick={() => setChartType('line')}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        chartType === 'line' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      )}
                      title="Gráfico de Linha"
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setChartType('candlestick')}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        chartType === 'candlestick' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      )}
                      title="Gráfico de Velas (Candlestick)"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
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
                  {chartType === 'line' ? (
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
                        tickFormatter={(value) => `R$ ${value}`}
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
                      <Brush 
                        dataKey="date" 
                        height={30} 
                        stroke="#2563eb" 
                        fill="#f8fafc"
                        tickFormatter={(label) => label}
                      />
                    </LineChart>
                  ) : (
                    <ComposedChart data={chartData}>
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
                        tickFormatter={(value) => `R$ ${value}`}
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
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const symbol = tickers[0];
                            const ohlc = data[`${symbol}_OHLC`];
                            if (!ohlc) return null;
                            return (
                              <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-100 min-w-[160px]">
                                <p className="text-xs font-black text-gray-400 uppercase mb-2">{data.fullDate}</p>
                                <p className="text-sm font-black text-blue-600 mb-3">{symbol}</p>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-gray-400">ABERTURA</span>
                                    <span>R$ {ohlc.open.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-gray-400">MÁXIMA</span>
                                    <span className="text-emerald-600">R$ {ohlc.high.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-gray-400">MÍNIMA</span>
                                    <span className="text-rose-600">R$ {ohlc.low.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs font-bold pt-1 border-t border-gray-50">
                                    <span className="text-gray-400">FECHAMENTO</span>
                                    <span>R$ {ohlc.close.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend verticalAlign="top" height={36}/>
                      
                      {/* Main Ticker Chart */}
                      {chartType === 'candlestick' ? (
                        <>
                          {/* Candlestick Wick (using a narrow Bar) */}
                          <Bar 
                            dataKey={(data) => {
                              const ohlc = data[`${tickers[0]}_OHLC`];
                              return ohlc ? [ohlc.low, ohlc.high] : null;
                            }}
                            fill="#000"
                            barSize={2}
                            name={`Wick (${tickers[0]})`}
                          >
                            {chartData.map((entry, index) => {
                              const ohlc = entry[`${tickers[0]}_OHLC`];
                              const color = ohlc?.isPositive ? '#10b981' : '#f43f5e';
                              return <Cell key={`wick-${index}`} fill={color} />;
                            })}
                          </Bar>

                          {/* Candlestick Body */}
                          <Bar 
                            dataKey={(data) => {
                              const ohlc = data[`${tickers[0]}_OHLC`];
                              return ohlc ? [ohlc.open, ohlc.close] : null;
                            }}
                            name={`Candle (${tickers[0]})`}
                          >
                            {chartData.map((entry, index) => {
                              const ohlc = entry[`${tickers[0]}_OHLC`];
                              const color = ohlc?.isPositive ? '#10b981' : '#f43f5e';
                              return <Cell key={`body-${index}`} fill={color} />;
                            })}
                          </Bar>
                        </>
                      ) : (
                        <Line 
                          type="monotone" 
                          dataKey={tickers[0]} 
                          stroke={COLORS[0]} 
                          strokeWidth={3}
                          dot={false}
                          name={tickers[0]}
                        />
                      )}

                      {/* Line overlays for other comparing stocks */}
                      {stocksData.slice(1).map((stock, idx) => (
                        <Line 
                          key={stock.symbol}
                          type="monotone" 
                          dataKey={stock.symbol} 
                          stroke={COLORS[idx + 1]} 
                          strokeWidth={2}
                          dot={false}
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
                        />
                      )}
                      
                      <Brush 
                        dataKey="date" 
                        height={30} 
                        stroke="#2563eb" 
                        fill="#f8fafc"
                        tickFormatter={(label) => label}
                      />
                    </ComposedChart>
                  )}
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
                      <div 
                        className="cursor-pointer group flex-1"
                        onClick={() => setSelectedStock(stock)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className="text-xs font-bold text-white px-2 py-0.5 rounded uppercase tracking-wider group-hover:bg-opacity-90 transition-all"
                            style={{ backgroundColor: COLORS[idx] }}
                          >
                            {stock.symbol}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Ver Detalhes</span>
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
                          onClick={() => setAlertForm({ 
                            symbol: stock.symbol, 
                            targetPrice: stock.regularMarketPrice.toString(), 
                            condition: 'above',
                            targetVolume: '',
                            volumeCondition: 'above',
                            frequency: '1m'
                          })}
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
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-blue-800 tracking-wider">Condição de Preço</label>
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
                            <input 
                              type="number"
                              step="0.01"
                              value={alertForm.targetPrice}
                              onChange={(e) => setAlertForm(prev => prev ? { ...prev, targetPrice: e.target.value } : null)}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-bold"
                              placeholder="Preço alvo (BRL)..."
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-blue-800 tracking-wider">Condição de Volume (Opcional)</label>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setAlertForm(prev => prev ? { ...prev, volumeCondition: 'above' } : null)}
                                className={cn(
                                  "flex-1 py-1 text-[10px] font-bold rounded-md border transition-all",
                                  alertForm.volumeCondition === 'above' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-200"
                                )}
                              >
                                {'>'} Volume
                              </button>
                              <button 
                                onClick={() => setAlertForm(prev => prev ? { ...prev, volumeCondition: 'below' } : null)}
                                className={cn(
                                  "flex-1 py-1 text-[10px] font-bold rounded-md border transition-all",
                                  alertForm.volumeCondition === 'below' ? "bg-rose-600 text-white border-rose-600" : "bg-white text-rose-600 border-rose-200"
                                )}
                              >
                                {'<'} Volume
                              </button>
                            </div>
                            <input 
                              type="number"
                              value={alertForm.targetVolume}
                              onChange={(e) => setAlertForm(prev => prev ? { ...prev, targetVolume: e.target.value } : null)}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-bold"
                              placeholder="Volume alvo..."
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-blue-800 tracking-wider">Frequência de Checagem</label>
                            <select 
                              value={alertForm.frequency}
                              onChange={(e) => setAlertForm(prev => prev ? { ...prev, frequency: e.target.value as any } : null)}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-blue-200 outline-none bg-white font-bold"
                            >
                              <option value="1m">A cada 1 minuto</option>
                              <option value="5m">A cada 5 minutos</option>
                              <option value="15m">A cada 15 minutos</option>
                              <option value="30m">A cada 30 minutos</option>
                              <option value="1h">A cada 1 hora</option>
                            </select>
                          </div>

                          <button 
                            disabled={!alertForm.targetPrice || isNaN(parseFloat(alertForm.targetPrice))}
                            onClick={() => addAlert(
                              stock.symbol, 
                              parseFloat(alertForm.targetPrice), 
                              alertForm.condition,
                              alertForm.targetVolume ? parseFloat(alertForm.targetVolume) : undefined,
                              alertForm.volumeCondition,
                              alertForm.frequency
                            )}
                            className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> Criar Alerta Complexo
                          </button>
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

              {newsError && (
                <div className="mb-6 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-between gap-3 text-rose-600 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-wider">Falha ao carregar notícias</span>
                      <p className="text-xs font-medium opacity-80">{newsError}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => fetchNews(tickers)}
                    className="px-3 py-1 bg-white border border-rose-200 rounded-lg text-[10px] font-black uppercase hover:bg-rose-50 transition-colors shadow-sm"
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}

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
                        setAlertForm({ 
                          symbol: sidebarSymbolInput, 
                          targetPrice: '', 
                          condition: 'above',
                          targetVolume: '',
                          volumeCondition: 'above',
                          frequency: '1m'
                        });
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
                     <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-blue-800 tracking-wider">Condição de Preço</label>
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
                          <input 
                            type="number"
                            step="0.01"
                            placeholder="Preço Alvo"
                            value={alertForm.targetPrice}
                            onChange={(e) => setAlertForm({ ...alertForm, targetPrice: e.target.value })}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-blue-200 outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-blue-800 tracking-wider">Volume (Opcional)</label>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setAlertForm({ ...alertForm, volumeCondition: 'above' })}
                              className={cn(
                                "flex-1 py-1.5 text-xs font-bold rounded-lg border",
                                alertForm.volumeCondition === 'above' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-200"
                              )}
                            >{'>'} Vol</button>
                            <button 
                              onClick={() => setAlertForm({ ...alertForm, volumeCondition: 'below' })}
                              className={cn(
                                "flex-1 py-1.5 text-xs font-bold rounded-lg border",
                                alertForm.volumeCondition === 'below' ? "bg-rose-600 text-white border-rose-600" : "bg-white text-rose-600 border-rose-200"
                              )}
                            >{'<'} Vol</button>
                          </div>
                          <input 
                            type="number"
                            placeholder="Volume Alvo"
                            value={alertForm.targetVolume}
                            onChange={(e) => setAlertForm({ ...alertForm, targetVolume: e.target.value })}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-blue-200 outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-blue-800 tracking-wider">Frequência</label>
                          <select 
                            value={alertForm.frequency}
                            onChange={(e) => setAlertForm({ ...alertForm, frequency: e.target.value as any })}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-blue-200 outline-none bg-white font-bold"
                          >
                            <option value="1m">1 minuto</option>
                            <option value="5m">5 minutos</option>
                            <option value="15m">15 minutos</option>
                            <option value="30m">30 minutos</option>
                            <option value="1h">1 hora</option>
                          </select>
                        </div>

                        <button 
                          disabled={!alertForm.targetPrice}
                          onClick={() => addAlert(
                            alertForm.symbol, 
                            parseFloat(alertForm.targetPrice), 
                            alertForm.condition,
                            alertForm.targetVolume ? parseFloat(alertForm.targetVolume) : undefined,
                            alertForm.volumeCondition,
                            alertForm.frequency
                          )}
                          className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> Criar Alerta
                        </button>
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
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded",
                        alert.condition === 'above' ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"
                      )}>
                        Price {alert.condition === 'above' ? '≥' : '≤'} R$ {alert.targetPrice.toFixed(2)}
                      </div>
                      {alert.targetVolume && (
                        <div className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded",
                          alert.volumeCondition === 'above' ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"
                        )}>
                          Vol {alert.volumeCondition === 'above' ? '≥' : '≤'} {(alert.targetVolume / 1e6).toFixed(1)}M
                        </div>
                      )}
                      <div className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase">
                         {alert.frequency}
                      </div>
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

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedStock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStock(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  {selectedStock.logoUrl && (
                    <img src={selectedStock.logoUrl} alt={selectedStock.symbol} className="w-12 h-12 rounded-xl object-contain bg-gray-50 p-2" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{selectedStock.symbol}</span>
                      <span className="text-[10px] py-0.5 px-2 bg-gray-100 text-gray-400 rounded-full font-bold uppercase tracking-wider">B3 S.A.</span>
                    </div>
                    <h2 className="text-xl font-black text-gray-900">{selectedStock.longName || selectedStock.shortName}</h2>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStock(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                {/* Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Preço Atual</span>
                    <span className="text-lg font-black tracking-tighter">R$ {selectedStock.regularMarketPrice.toFixed(2)}</span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Variação</span>
                    <span className={cn(
                      "text-lg font-black tracking-tighter",
                      selectedStock.regularMarketChange >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {selectedStock.regularMarketChangePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">P/L</span>
                    <span className="text-lg font-black tracking-tighter">{selectedStock.priceEarnings?.toFixed(2) || '-'}</span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Div. Yield</span>
                    <span className="text-lg font-black tracking-tighter text-emerald-600">
                      {selectedStock.dividendYield ? `${(selectedStock.dividendYield * 100).toFixed(2)}%` : '-'}
                    </span>
                  </div>
                </div>

                {/* Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Perfil da Empresa
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
                        {selectedStock.longBusinessSummary || "Nenhuma descrição detalhada disponível para esta empresa no momento."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1 p-4 rounded-2xl border border-gray-100">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Setor</span>
                        <span className="text-sm font-bold text-gray-700">{selectedStock.sector || '-'}</span>
                      </div>
                      <div className="flex flex-col gap-1 p-4 rounded-2xl border border-gray-100">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Indústria</span>
                        <span className="text-sm font-bold text-gray-700">{selectedStock.industry || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Links e Contato</h3>
                      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        {selectedStock.website ? (
                          <a 
                            href={selectedStock.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-sm font-bold text-blue-600"
                          >
                            Site Oficial
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <div className="p-4 text-sm text-gray-400 italic">Site não disponível</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Fundamentos</h3>
                      <div className="space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400 font-bold uppercase">Cap. de Mercado</span>
                          <span className="font-bold">
                            {selectedStock.marketCap 
                              ? selectedStock.marketCap >= 1e9 
                                ? `R$ ${(selectedStock.marketCap / 1e9).toFixed(2)}B`
                                : `R$ ${(selectedStock.marketCap / 1e6).toFixed(2)}M`
                              : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400 font-bold uppercase">Volume (24h)</span>
                          <span className="font-bold">{(selectedStock.regularMarketVolume / 1e6).toFixed(1)}M</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* News Section */}
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Newspaper className="w-4 h-4" />
                      Notícias de {selectedStock.symbol}
                    </span>
                    {stockNewsLoading && <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />}
                  </h3>
                  
                  {stockNews.length > 0 ? (
                    <div className="space-y-4">
                      {stockNews.slice(0, 4).map((item, i) => (
                        <a 
                          key={i}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex gap-4 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-gray-50 transition-all group"
                        >
                          {item.image && (
                            <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden hidden sm:block">
                              <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-blue-600 uppercase">{item.source}</span>
                              <span className="text-[10px] text-gray-400 font-bold">• {new Date(item.publishedAt).toLocaleDateString()}</span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">{item.title}</h4>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.description}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : !stockNewsLoading && (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-xs text-gray-400 font-medium italic">Nenhuma notícia específica encontrada para este ativo.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                <button 
                  onClick={() => setSelectedStock(null)}
                  className="px-8 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
