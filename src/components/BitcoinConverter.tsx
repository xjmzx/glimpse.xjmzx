
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';

interface CurrencyRate {
  symbol: string;
  name: string;
  rate: number;
  satoshisPerUnit: number;
  flag: string;
}

type Direction = 'up' | 'down' | null;

const FavIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4" shapeRendering="crispEdges" className={className}>
    <rect x="0" y="0" width="2" height="2" fill="#0d1117"/>
    <rect x="2" y="0" width="2" height="2" fill="#34d399"/>
    <rect x="0" y="2" width="2" height="2" fill="#a78bfa"/>
    <rect x="2" y="2" width="2" height="2" fill="#131d2a"/>
  </svg>
);

const REFRESH_MS = 21000;
const SQUARE_COUNT = 21;

// Interpolate between emerald and purple across 21 positions: emerald → purple → emerald
function lerpHex(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

const EMERALD: [number, number, number] = [52, 211, 153];
const PURPLE:  [number, number, number] = [167, 139, 250];

// Each square gets its own lit color; unlit is always very dark
const SQUARE_COLORS = Array.from({ length: SQUARE_COUNT }, (_, i) => {
  const t = i < 10 ? i / 10 : (SQUARE_COUNT - 1 - i) / 10;
  return lerpHex(EMERALD, PURPLE, t);
});

const SQUARE_DIM = '#161e2e';

const BitcoinConverter = () => {
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [changed, setChanged] = useState<Record<string, Direction>>({});
  const [tick, setTick] = useState(0);
  const prevRates = useRef<Record<string, number>>({});

  const currencies = [
    { symbol: 'USD', name: 'US Dollar', flag: '🇺🇸' },
    { symbol: 'EUR', name: 'Euro', flag: '🇪🇺' },
    { symbol: 'GBP', name: 'British Pound', flag: '🇬🇧' },
    { symbol: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
    { symbol: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
    { symbol: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
    { symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
    { symbol: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  ];

  const fetchBitcoinRates = async () => {
    try {
      setError(null);
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur,gbp,jpy,cad,aud,chf,cny'
      );
      const bitcoinPrices = response.data.bitcoin;
      const SATOSHIS_PER_BITCOIN = 100000000;
      const newRates: CurrencyRate[] = currencies.map(currency => {
        const price = bitcoinPrices[currency.symbol.toLowerCase()];
        const satoshisPerUnit = price ? Math.round(SATOSHIS_PER_BITCOIN / price) : 0;
        return { symbol: currency.symbol, name: currency.name, rate: price || 0, satoshisPerUnit, flag: currency.flag };
      });

      // Detect per-card direction changes
      const directions: Record<string, Direction> = {};
      newRates.forEach(r => {
        const prev = prevRates.current[r.symbol];
        if (prev !== undefined && r.satoshisPerUnit !== prev) {
          directions[r.symbol] = r.satoshisPerUnit > prev ? 'up' : 'down';
        }
        prevRates.current[r.symbol] = r.satoshisPerUnit;
      });

      setRates(newRates);
      setLastUpdated(new Date());
      setJustRefreshed(true);
      setTick(0);
      setTimeout(() => setJustRefreshed(false), 2000);

      if (Object.keys(directions).length > 0) {
        setChanged(directions);
        setTimeout(() => setChanged({}), 1800);
      }
    } catch (err) {
      console.error('Error fetching Bitcoin rates:', err);
      setError('Could not reach CoinGecko — will retry shortly.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBitcoinRates();
    const fetchInterval = setInterval(fetchBitcoinRates, REFRESH_MS);
    const tickInterval = setInterval(() => {
      setTick(t => (t < SQUARE_COUNT ? t + 1 : 0));
    }, 1000);
    return () => {
      clearInterval(fetchInterval);
      clearInterval(tickInterval);
    };
  }, []);

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(price);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Nav */}
      <nav className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="https://fizx.uk" className="font-mono text-sm">
            <span className="bg-gradient-to-r from-[#34d399] via-[#a78bfa] to-[#34d399] bg-clip-text text-transparent font-bold">fizx</span>
            <span className="text-muted-foreground">.uk</span>
            <span className="text-muted-foreground/40 ml-1">/ glimpse</span>
          </a>
        </div>
      </nav>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">

        {/* Header */}
        <div className="mb-10">

          {/* Title row: favicon — title — [21 squares] — refresh icon */}
          <div className="flex items-center gap-3 mb-3">
            <FavIcon className="h-9 w-9 shrink-0" />

            <h1 className="text-3xl font-bold tracking-tight shrink-0">
              <span className="bg-gradient-to-r from-[#34d399] via-[#a78bfa] to-[#34d399] bg-clip-text text-transparent">
                glimpse
              </span>
            </h1>

            {/* 21-square countdown strip */}
            <div className="flex items-center gap-[3px] flex-1 min-w-0 px-2">
              {SQUARE_COLORS.map((litColor, i) => (
                <div
                  key={i}
                  className="flex-1 h-[10px] transition-colors duration-300"
                  style={{ backgroundColor: i < tick ? litColor : SQUARE_DIM }}
                />
              ))}
            </div>

            {/* Refresh icon only */}
            <button
              onClick={fetchBitcoinRates}
              disabled={loading}
              className="shrink-0 p-2 hover:bg-primary/10 disabled:opacity-40 text-primary transition-colors"
              aria-label="Refresh rates"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-muted-foreground text-sm">
            Real-time Bitcoin conversion rates in satoshis per currency unit
          </p>
          <div className="flex items-center gap-3 mt-1">
            {error ? (
              <span className="text-xs font-mono text-amber-500/70">⚠ {error}</span>
            ) : lastUpdated ? (
              <>
                <span className="text-muted-foreground/50 text-xs font-mono">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
                <span className={`text-xs font-mono px-1.5 py-0.5 border transition-all duration-500
                  ${justRefreshed
                    ? 'text-primary border-primary/50 bg-primary/10'
                    : 'text-muted-foreground/40 border-border'}`}>
                  CoinGecko
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* Currency Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rates.map((rate) => {
            const dir = changed[rate.symbol] ?? null;
            return (
              <Card
                key={rate.symbol}
                className={`bg-card border transition-all duration-500
                  ${dir === 'up'   ? 'border-primary shadow-lg shadow-primary/20' :
                    dir === 'down' ? 'border-accent/70 shadow-lg shadow-accent/20' :
                    'border-border hover:border-primary/40'}
                  rounded-none`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-card-foreground">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{rate.flag}</span>
                      <span className="font-mono font-bold">{rate.symbol}</span>
                    </div>
                    {dir === 'up'   ? <TrendingUp   className="h-4 w-4 text-primary transition-all" /> :
                     dir === 'down' ? <TrendingDown  className="h-4 w-4 text-accent transition-all" /> :
                                      <TrendingUp   className="h-4 w-4 text-muted-foreground/30" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-muted-foreground text-sm">{rate.name}</p>
                    <p className="text-foreground text-lg font-mono">
                      {rate.rate > 0 ? formatPrice(rate.rate, rate.symbol) : 'Loading...'}
                    </p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-muted-foreground text-xs font-mono uppercase tracking-wider mb-1">
                      sats per 1 {rate.symbol}
                    </p>
                    <p className={`text-xl font-bold font-mono transition-colors duration-500
                      ${dir === 'up' ? 'text-primary' : dir === 'down' ? 'text-accent' : 'text-primary'}`}>
                      {rate.satoshisPerUnit > 0 ? formatNumber(rate.satoshisPerUnit) : 'Loading...'}
                      <span className="text-sm text-muted-foreground ml-1">sats</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-y-2 text-xs text-muted-foreground font-mono">
          <span>glimpse.fizx.uk · CoinGecko API · 21s refresh</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {[
              ['https://fizx.uk',         'fizx.uk'],
              ['https://glimpse.fizx.uk', 'glimpse'],
              ['https://pulse.fizx.uk',   'pulse'],
              ['https://ln.fizx.uk',      'ln'],
              ['https://stakes.fizx.uk',  'stakes'],
              ['https://sonic.fizx.uk',   'sonic'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="hover:text-primary transition-colors">{label}</a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
};

export default BitcoinConverter;
