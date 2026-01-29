import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const POPULAR_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "AED", name: "UAE Dirham" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "KRW", name: "South Korean Won" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "ZAR", name: "South African Rand" },
];

interface ConversionResult {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export default function CurrencyConverterPage() {
  const [amount, setAmount] = useState<string>("1");
  const [fromCurrency, setFromCurrency] = useState<string>("USD");
  const [toCurrency, setToCurrency] = useState<string>("INR");
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [lastRate, setLastRate] = useState<number | null>(null);

  const { data: ratesData, isLoading: ratesLoading, refetch } = useQuery<ConversionResult>({
    queryKey: ["currency-rates", fromCurrency],
    queryFn: async () => {
      const res = await fetch(`https://api.frankfurter.app/latest?from=${fromCurrency}`);
      if (!res.ok) throw new Error("Failed to fetch rates");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const handleConvert = () => {
    if (!ratesData || !amount) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return;

    const rate = ratesData.rates[toCurrency];
    if (rate) {
      setConvertedAmount(numAmount * rate);
      setLastRate(rate);
    }
  };

  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
    setConvertedAmount(null);
    setLastRate(null);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Currency Converter</h1>
        <p className="text-muted-foreground mt-1">Convert between currencies using live exchange rates</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Convert Currency</CardTitle>
            <CardDescription>Enter amount and select currencies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="input-amount"
              />
            </div>

            <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
              <div className="space-y-2">
                <Label>From</Label>
                <Select value={fromCurrency} onValueChange={(val) => { setFromCurrency(val); setConvertedAmount(null); }}>
                  <SelectTrigger data-testid="select-from-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleSwap}
                className="mb-0.5"
                data-testid="button-swap"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>

              <div className="space-y-2">
                <Label>To</Label>
                <Select value={toCurrency} onValueChange={(val) => { setToCurrency(val); setConvertedAmount(null); }}>
                  <SelectTrigger data-testid="select-to-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleConvert} 
              className="w-full" 
              disabled={ratesLoading || !amount}
              data-testid="button-convert"
            >
              {ratesLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading rates...
                </>
              ) : (
                "Convert"
              )}
            </Button>

            {convertedAmount !== null && lastRate !== null && (
              <div className="p-4 bg-muted rounded-lg space-y-2" data-testid="conversion-result">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(parseFloat(amount))} {fromCurrency} =
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {formatNumber(convertedAmount)} {toCurrency}
                  </p>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  1 {fromCurrency} = {formatNumber(lastRate)} {toCurrency}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Exchange Rates</CardTitle>
              <CardDescription>Current rates from {fromCurrency}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()} data-testid="button-refresh-rates">
              <RefreshCw className={`h-4 w-4 ${ratesLoading ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {ratesLoading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : ratesData ? (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {POPULAR_CURRENCIES.filter(c => c.code !== fromCurrency).map((currency) => {
                  const rate = ratesData.rates[currency.code];
                  if (!rate) return null;
                  return (
                    <div
                      key={currency.code}
                      className="flex justify-between items-center p-2 rounded hover-elevate cursor-pointer"
                      onClick={() => { setToCurrency(currency.code); setConvertedAmount(null); }}
                      data-testid={`rate-${currency.code}`}
                    >
                      <div>
                        <span className="font-medium">{currency.code}</span>
                        <span className="text-muted-foreground text-sm ml-2">{currency.name}</span>
                      </div>
                      <span className="font-mono">{formatNumber(rate)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Unable to load rates</p>
            )}
            {ratesData && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Last updated: {ratesData.date}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
