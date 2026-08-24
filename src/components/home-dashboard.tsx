"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  MessageSquareText,
  X,
} from "lucide-react";
import {
  formatCompactCurrency,
  formatCurrency,
  parseTransactionInput,
  type ParsedTransaction,
} from "@/lib/finance";
import type { Transaction } from "@/lib/mock-data";
import { TransactionRow } from "./transaction-row";

type Summary = {
  available: number;
  spentThisMonth: number;
  incomeThisMonth: number;
  monthLabel: string;
};

type HomeDashboardProps = {
  initialSummary: Summary;
  initialTransactions: Transaction[];
};

export function HomeDashboard({
  initialSummary,
  initialTransactions,
}: HomeDashboardProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [recentTransactions, setRecentTransactions] = useState(initialTransactions);
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<ParsedTransaction | null>(null);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!preview) return;

    const previousOverflow = document.body.style.overflow;
    const composerInput = inputRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
      if (event.key !== "Tab") return;

      const focusableElements = sheetRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      composerInput?.focus();
    };
  }, [preview]);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => setSavedMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  function handleParse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = parseTransactionInput(input);

    if (result.status === "invalid") {
      setError(result.message);
      return;
    }

    setError("");
    setPreview(result.transaction);
  }

  function saveTransaction() {
    if (!preview) return;

    const transaction: Transaction = {
      ...preview,
      id: `local-${Date.now()}`,
      account: "BCA",
      date: "2026-08-25",
      time: "Sekarang",
    };

    setRecentTransactions((current) => [transaction, ...current].slice(0, 4));
    setSummary((current) => ({
      ...current,
      available:
        current.available +
        (preview.type === "INCOME" ? preview.amount : -preview.amount),
      spentThisMonth:
        current.spentThisMonth +
        (preview.type === "EXPENSE" ? preview.amount : 0),
      incomeThisMonth:
        current.incomeThisMonth +
        (preview.type === "INCOME" ? preview.amount : 0),
    }));
    setPreview(null);
    setInput("");
    setSavedMessage("Transaksi ditambahkan ke data sementara.");
  }

  return (
    <main className="page home-page page-enter">
      <header className="home-header">
        <div>
          <p>Selamat datang</p>
          <h1>Halo, Bagus</h1>
        </div>
        <Link className="avatar" href="/profile" aria-label="Buka profil Bagus">BA</Link>
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
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (error) setError("");
            }}
            placeholder="Contoh: kopi 18rb"
            autoComplete="off"
          />
          <button type="submit" disabled={!input.trim()} aria-label="Tinjau transaksi">
            <ArrowRight aria-hidden="true" size={19} />
          </button>
        </form>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="quick-examples" aria-label="Contoh transaksi">
          {["Makan 25rb", "Grab 22rb", "Gaji masuk 5jt"].map((example) => (
            <button type="button" key={example} onClick={() => setInput(example)}>{example}</button>
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
        <div className="transaction-list">
          {recentTransactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </section>

      {preview ? (
        <div className="sheet-layer" role="presentation">
          <button
            className="sheet-backdrop"
            type="button"
            aria-label="Tutup tinjauan transaksi"
            onClick={() => setPreview(null)}
          />
          <section
            ref={sheetRef}
            className="confirmation-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
          >
            <div className="sheet-handle" aria-hidden="true" />
            <div className="sheet-heading">
              <div>
                <p className="eyebrow">Periksa dulu</p>
                <h2 id="confirmation-title">Tinjau transaksi</h2>
              </div>
              <button ref={closeButtonRef} type="button" onClick={() => setPreview(null)} aria-label="Tutup">
                <X aria-hidden="true" size={19} />
              </button>
            </div>
            <p className={`preview-amount preview-amount--${preview.type.toLowerCase()}`}>
              {preview.type === "EXPENSE" ? "−" : "+"}{formatCurrency(preview.amount)}
            </p>
            <dl className="preview-details">
              <div><dt>Deskripsi</dt><dd>{preview.description}</dd></div>
              <div><dt>Kategori</dt><dd>{preview.category}</dd></div>
              <div><dt>Akun</dt><dd>BCA</dd></div>
              <div><dt>Jenis</dt><dd>{preview.type === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}</dd></div>
            </dl>
            <div className="sheet-actions">
              <button className="secondary-button" type="button" onClick={() => setPreview(null)}>Ubah</button>
              <button className="primary-button" type="button" onClick={saveTransaction}>
                <Check aria-hidden="true" size={18} /> Simpan transaksi
              </button>
            </div>
            <p className="sheet-caption">Tersimpan sementara dan akan hilang saat halaman dimuat ulang.</p>
          </section>
        </div>
      ) : null}

      {savedMessage ? (
        <div className="toast" role="status"><Check aria-hidden="true" size={17} />{savedMessage}</div>
      ) : null}
    </main>
  );
}
