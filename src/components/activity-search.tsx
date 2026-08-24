"use client";

import { useDeferredValue, useState } from "react";
import { Search, X } from "lucide-react";
import { filterTransactions, groupTransactionsByDate } from "@/lib/finance";
import { useMockFinance } from "./mock-finance-provider";
import { TransactionRow } from "./transaction-row";

const dateLabels: Record<string, string> = {
  "2026-08-25": "Hari ini",
  "2026-08-24": "Kemarin",
};

function formatGroupDate(date: string): string {
  if (dateLabels[date]) return dateLabels[date];

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T00:00:00`));
}

export function ActivitySearch() {
  const { transactions } = useMockFinance();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const groups = groupTransactionsByDate(
    filterTransactions(transactions, deferredQuery),
  );

  return (
    <section aria-label="Daftar transaksi">
      <div className="search-field">
        <Search aria-hidden="true" size={19} />
        <label className="sr-only" htmlFor="transaction-search">Cari transaksi</label>
        <input
          id="transaction-search"
          name="transaction-search"
          type="search"
          placeholder="Cari transaksi, kategori, atau akun…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian">
            <X aria-hidden="true" size={17} />
          </button>
        ) : null}
      </div>

      <div className="activity-results" aria-live="polite">
        {groups.length ? groups.map((group) => (
          <section className="transaction-group" key={group.date}>
            <h2>{formatGroupDate(group.date)}</h2>
            <div>
              {group.transactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          </section>
        )) : (
          <div className="empty-state">
            <Search aria-hidden="true" size={22} />
            <h2>Tidak ada hasil</h2>
            <p>Coba kata kunci lain atau periksa ejaannya.</p>
          </div>
        )}
      </div>
    </section>
  );
}
