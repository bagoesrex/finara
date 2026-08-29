"use client";

import Link from "next/link";
import { ChevronRight, ReceiptText } from "lucide-react";

import { useFinance } from "@/components/finance-provider";
import { useViewer } from "@/components/viewer-provider";
import { getInitials } from "@/lib/auth";
import { formatCompactCurrency, formatSignedCurrency } from "@/lib/finance";
import { HomeTransactionComposer } from "./home-transaction-composer";
import { TransactionRow } from "./transaction-row";

export function HomeDashboard() {
  const viewer = useViewer();
  const { summary, transactions } = useFinance();
  const recentTransactions = transactions.slice(0, 4);
  const displayName = viewer.name || "Kamu";
  const firstName = displayName.trim().split(/\s+/)[0];

  return (
    <main className="page home-page page-enter">
      <header className="home-header">
        <div>
          <p>Selamat datang</p>
          <h1>Halo, {firstName}</h1>
        </div>
        <Link
          className="avatar"
          href="/profile"
          aria-label={`Buka profil ${displayName}`}
        >
          {getInitials(displayName)}
        </Link>
      </header>

      <section className="balance-section" aria-labelledby="balance-title">
        <div className="balance-heading">
          <p id="balance-title">Saldo tersedia</p>
          <span>{summary.monthLabel}</span>
        </div>
        <strong>{formatSignedCurrency(summary.available)}</strong>
        <div className="month-stats">
          <div>
            <span>Pengeluaran</span>
            <strong>{formatCompactCurrency(summary.spentThisMonth)}</strong>
          </div>
          <div>
            <span>Pemasukan</span>
            <strong>{formatCompactCurrency(summary.incomeThisMonth)}</strong>
          </div>
        </div>
      </section>

      <HomeTransactionComposer />

      <section className="section-block recent-section" aria-labelledby="recent-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Terbaru</p>
            <h2 id="recent-title">Aktivitas terakhir</h2>
          </div>
          <Link href="/activity">Lihat semua <ChevronRight aria-hidden="true" size={17} /></Link>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="transaction-list">
            {recentTransactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </div>
        ) : (
          <div className="home-empty-state">
            <ReceiptText aria-hidden="true" size={21} />
            <div>
              <h3>Belum ada aktivitas</h3>
              <p>Transaksi pertama yang kamu simpan akan muncul di sini.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
