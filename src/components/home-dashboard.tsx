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
import { useViewer } from "@/components/viewer-provider";
import { useFinance } from "@/components/finance-provider";
import { getInitials } from "@/lib/auth";
import type { TransactionDraft } from "@/lib/finance-query";
import {
  formatCompactCurrency,
  formatSignedCurrency,
  parseTransactionInput,
} from "@/lib/finance";
import { getDateKeyInTimeZone } from "@/lib/transactions";
import { TransactionConfirmationSheet } from "./transaction-confirmation-sheet";
import { TransactionRow } from "./transaction-row";

export function HomeDashboard() {
  const viewer = useViewer();
  const { accounts, addTransaction, categories, summary, transactions } =
    useFinance();
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<TransactionDraft | null>(null);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const recentTransactions = transactions.slice(0, 4);
  const displayName = viewer.name || "Kamu";
  const firstName = displayName.trim().split(/\s+/)[0];
  const closePreview = useCallback(() => {
    if (!savingRef.current) setPreview(null);
  }, []);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => setSavedMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  function handleParse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = parseTransactionInput(input, getDateKeyInTimeZone(new Date()));

    if (result.status === "invalid") {
      setError(result.message);
      return;
    }

    const account = accounts[0];
    const category =
      categories.find(
        (item) =>
          item.type === result.transaction.type &&
          item.name === result.transaction.category,
      ) ??
      categories.find(
        (item) => item.type === result.transaction.type && item.name === "Other",
      ) ??
      categories.find((item) => item.type === result.transaction.type);

    if (!account || !category) {
      setError("Akun atau kategori belum tersedia.");
      return;
    }

    setError("");
    setSaveError("");
    setIsSaving(false);
    savingRef.current = false;
    setPreview({
      ...result.transaction,
      accountId: account.id,
      account: account.name,
      categoryId: category.id,
      category: category.name,
      clientRequestId: crypto.randomUUID(),
    });
  }

  async function saveTransaction() {
    if (!preview || savingRef.current) return;

    savingRef.current = true;
    setIsSaving(true);
    setSaveError("");

    try {
      const transaction = await addTransaction({
        ...preview,
        description: preview.description.trim(),
      });
      savingRef.current = false;
      setPreview(null);
      setInput("");
      setIsSaving(false);
      setSavedMessage(`${transaction.description} berhasil dicatat.`);
    } catch {
      savingRef.current = false;
      setIsSaving(false);
      setSaveError("Transaksi belum tersimpan. Coba lagi.");
    }
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
          error={saveError}
          isSaving={isSaving}
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
