"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  MessageSquareText,
  ReceiptText,
} from "lucide-react";
import { usePrototypeAuth } from "@/components/prototype-auth-provider";
import { getInitials } from "@/lib/auth";
import {
  formatCompactCurrency,
  formatCurrency,
  parseTransactionInput,
} from "@/lib/finance";
import { mockToday } from "@/lib/mock-data";
import { useMockFinance, type TransactionDraft } from "./mock-finance-provider";
import { TransactionConfirmationSheet } from "./transaction-confirmation-sheet";
import { TransactionRow } from "./transaction-row";

export function HomeDashboard() {
  const auth = usePrototypeAuth();
  const { accounts, addTransaction, summary, transactions } = useMockFinance();
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<TransactionDraft | null>(null);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const recentTransactions = transactions.slice(0, 4);
  const displayName = auth.user?.name ?? "Kamu";
  const firstName = displayName.trim().split(/\s+/)[0];
  const closePreview = useCallback(() => setPreview(null), []);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => setSavedMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  function handleParse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = parseTransactionInput(input, mockToday);

    if (result.status === "invalid") {
      setError(result.message);
      return;
    }

    setError("");
    savingRef.current = false;
    setPreview({ ...result.transaction, account: accounts[0]?.name ?? "" });
  }

  function saveTransaction() {
    if (!preview || savingRef.current) return;

    savingRef.current = true;
    const transaction = addTransaction({
      ...preview,
      description: preview.description.trim(),
    });
    setPreview(null);
    setInput("");
    setSavedMessage(`${transaction.description} berhasil dicatat.`);
  }

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
        <strong>{formatCurrency(summary.available)}</strong>
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

      <section className="composer-section" aria-labelledby="composer-title">
        <div className="composer-heading">
          <span><MessageSquareText aria-hidden="true" size={18} /></span>
          <div>
            <h2 id="composer-title">Catat dengan kalimat biasa</h2>
            <p>Coba “makan ayam 25rb”</p>
          </div>
        </div>
        <form className="composer-form" onSubmit={handleParse}>
          <label className="sr-only" htmlFor="quick-transaction">Tulis transaksi</label>
          <input
            ref={inputRef}
            id="quick-transaction"
            name="transaction"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (error) setError("");
            }}
            placeholder="Contoh: kopi 18rb…"
            autoComplete="off"
          />
          <button type="submit" disabled={!input.trim()} aria-label="Tinjau transaksi">
            <ArrowRight aria-hidden="true" size={19} />
          </button>
        </form>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="quick-examples" aria-label="Contoh transaksi">
          {["Makan 25rb", "Grab 22rb", "Gaji masuk 5jt"].map((example) => (
            <button
              type="button"
              key={example}
              onClick={() => {
                setInput(example);
                setError("");
                inputRef.current?.focus();
              }}
            >
              {example}
            </button>
          ))}
        </div>
      </section>

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

      {preview ? (
        <TransactionConfirmationSheet
          draft={preview}
          onChange={setPreview}
          onClose={closePreview}
          onSave={saveTransaction}
        />
      ) : null}

      {savedMessage ? (
        <div className="toast" role="status" aria-live="polite">
          <Check aria-hidden="true" size={17} />{savedMessage}
        </div>
      ) : null}
    </main>
  );
}
