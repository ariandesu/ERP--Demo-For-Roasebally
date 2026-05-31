'use client';

import { useState, useEffect } from 'react';

const CURRENCY_EVENT = 'erp-currency-change';
export const EXCHANGE_RATE = 117.0; // 1 USD = 117 BDT (TK)

export type Currency = 'BDT' | 'USD';

export function useCurrency() {
  const [currency, setCurrency] = useState<Currency>('BDT');

  useEffect(() => {
    // Read initial value from localStorage if on client side
    const saved = localStorage.getItem('erp-currency-pref') as Currency;
    if (saved === 'BDT' || saved === 'USD') {
      setCurrency(saved);
    }

    const handleCurrencyChange = (e: Event) => {
      const customEvent = e as CustomEvent<Currency>;
      setCurrency(customEvent.detail);
    };

    window.addEventListener(CURRENCY_EVENT, handleCurrencyChange);
    return () => {
      window.removeEventListener(CURRENCY_EVENT, handleCurrencyChange);
    };
  }, []);

  const toggleCurrency = () => {
    const next: Currency = currency === 'BDT' ? 'USD' : 'BDT';
    localStorage.setItem('erp-currency-pref', next);
    setCurrency(next);
    
    // Dispatch custom event to notify all other hook instances on the page
    const event = new CustomEvent(CURRENCY_EVENT, { detail: next });
    window.dispatchEvent(event);
  };

  // Cost conversion helper
  const convertAmount = (amountInTk: number) => {
    if (currency === 'USD') {
      return amountInTk / EXCHANGE_RATE;
    }
    return amountInTk;
  };

  // Cost formatting helper
  const formatAmount = (amountInTk: number, options?: Intl.NumberFormatOptions) => {
    const value = convertAmount(amountInTk);
    if (currency === 'USD') {
      return `$${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options,
      })}`;
    }
    return `৳${value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    })}`;
  };

  // Simplified format for charts/KPIs where space is tight
  const formatCompact = (amountInTk: number) => {
    const value = convertAmount(amountInTk);
    const prefix = currency === 'USD' ? '$' : '৳';
    
    if (value >= 1_000_000) {
      return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${prefix}${(value / 1_000).toFixed(1)}k`;
    }
    return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return {
    currency,
    toggleCurrency,
    convertAmount,
    formatAmount,
    formatCompact,
    exchangeRate: EXCHANGE_RATE,
  };
}
