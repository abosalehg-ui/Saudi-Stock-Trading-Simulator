import { COMMISSION } from '../config.js';
import { gameState } from '../state.js';
import { findStock } from '../data/stocks.js';
import { getLang, t } from './i18n.js';

/**
 * Quote a CSV field, and neutralise anything a spreadsheet would evaluate as a
 * formula. The exported file is opened outside this app, so the leading
 * apostrophe is the difference between a cell of text and a cell Excel runs.
 */
function escapeCsvField(value) {
  let str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildTransactionsCsv() {
  const lang = getLang();
  const headers = t('csvHeaders');
  const rows = [headers.map(escapeCsvField).join(',')];
  gameState.transactions.forEach((tx) => {
    const stock = findStock(tx.symbol);
    const name = stock ? (lang === 'ar' ? stock.name : stock.nameEn) : tx.symbol;
    const date = new Date(tx.time).toISOString();
    const commission = tx.commission ?? tx.price * tx.quantity * COMMISSION;
    const total = tx.price * tx.quantity;
    rows.push(
      [
        date,
        tx.type,
        name,
        tx.symbol,
        tx.quantity,
        tx.price.toFixed(2),
        commission.toFixed(2),
        total.toFixed(2),
      ]
        .map(escapeCsvField)
        .join(',')
    );
  });
  return rows.join('\n');
}

export function downloadTransactionsCsv() {
  const csv = buildTransactionsCsv();
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tadawul-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
