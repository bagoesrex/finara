"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { groupTransactionsByDate } from "@/lib/finance";
import { getDateKeyInTimeZone } from "@/lib/transactions";
import { PageHeader } from "./page-header";
import { useFinance, useTransactionList } from "./finance-provider";
import { TransactionRow } from "./transaction-row";

function formatGroupDate(date: string, today: string): string {
  if (date === today) return "Hari ini";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T00:00:00`));
}

export function ActivitySearch() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filters = useMemo(
    () => ({ search: deferredQuery || undefined }),
    [deferredQuery],
  );
  const transactionQuery = useTransactionList(filters);
  const groups = groupTransactionsByDate(transactionQuery.transactions);
  const today = getDateKeyInTimeZone(new Date());

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

      <div
        className="activity-results"
        aria-busy={transactionQuery.isPending || transactionQuery.isFetchingNextPage}
        aria-live="polite"
      >
        {transactionQuery.isPending ? (
          <div className="empty-state" role="status">
            <h2>Memuat transaksi</h2>
            <p>Mohon tunggu sebentar.</p>
          </div>
        ) : transactionQuery.isError ? (
          <div className="empty-state" role="alert">
            <h2>Aktivitas belum dapat dimuat</h2>
            <p>Periksa koneksi lalu coba lagi.</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => transactionQuery.refetch()}
            >
              Coba lagi
            </button>
          </div>
        ) : groups.length ? groups.map((group) => (
          <section className="transaction-group" key={group.date}>
            <h2>{formatGroupDate(group.date, today)}</h2>
            <div>
              {group.transactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          </section>
        )) : (
          <div className="empty-state">
            <Search aria-hidden="true" size={22} />
            <h2>{deferredQuery ? "Tidak ada hasil" : "Belum ada transaksi"}</h2>
            <p>
              {deferredQuery
                ? "Coba kata kunci lain atau periksa ejaannya."
                : "Transaksi yang disimpan akan muncul di sini."}
            </p>
          </div>
        )}
        {transactionQuery.hasNextPage ? (
          <button
            className="secondary-button"
            type="button"
            disabled={transactionQuery.isFetchingNextPage}
            onClick={() => transactionQuery.fetchNextPage()}
          >
            {transactionQuery.isFetchingNextPage ? "Memuatâ€¦" : "Muat lainnya"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function ActivityDashboard() {
  const { summary } = useFinance();

  return (
    <main className="page page-enter">
      <PageHeader
        eyebrow={summary.monthLabel}
        title="Aktivitas"
        description="Semua pemasukan dan pengeluaranmu."
      />
      <ActivitySearch />
    </main>
  );
}
