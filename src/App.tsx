import { useState, useEffect, useCallback, FormEvent } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
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
  X
} from 'lucide-react';
import { cn } from './lib/utils';

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
  historicalDataPrice: {
    date: number;
    close: number;
  }[];
}

export default function App() {
  const [tickers, setTickers] = useState<string[]>(['PETR4']);
  const [searchInput, setSearchInput] = useState('');
  const [range, setRange] = useState('1mo');
  const [stocksData, setStocksData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        // Brapi returns an array even if some symbols are not found
        // We filter out any results that don't have historical data or price
        const validResults = result.results.filter((r: any) => r.regularMarketPrice !== undefined);
        if (validResults.length === 0) {
          setError('Nenhuma das ações foi encontrada.');
        }
        setStocksData(validResults);
      } else {
        setError('Erro ao processar as ações. Verifique os códigos.');
      }
    } catch (err) {
      setError('Erro ao buscar dados. Tente novamente mais tarde.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData(tickers, range);
  }, [tickers, range, fetchAllData]);

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
  // We need to use dates as keys
  const getChartData = () => {
    const dataMap: Record<string, any> = {};
    
    stocksData.forEach((stock) => {
      stock.historicalDataPrice?.forEach((day) => {
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
            onClick={() => fetchAllData(tickers, range)}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-5 h-5 text-gray-600", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tickers List */}
        <div className="flex flex-wrap gap-2 mb-6">
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
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
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
                      <div className="text-right">
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
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-gray-50 grid grid-cols-2 gap-x-4 gap-y-2">
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
            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 relative overflow-hidden">
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
