"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleCheckBig,
  FileQuestion,
  Landmark,
  Pencil,
  Tag,
  Trash2,
} from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { DeleteTransactionDialog } from "./delete-transaction-dialog";
import {
  useMockFinance,
  type TransactionDraft,
} from "./mock-finance-provider";
import { TransactionConfirmationSheet } from "./transaction-confirmation-sheet";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

function MissingTransaction({ deletedName }: { deletedName: string }) {
  const wasDeleted = Boolean(deletedName);
  const Icon = wasDeleted ? CircleCheckBig : FileQuestion;

  return (
    <main className="empty-page page-enter">
      <span className="empty-page__icon" aria-hidden="true">
        <Icon size={25} />
      </span>
      <p className="eyebrow">{wasDeleted ? "Selesai" : "Tidak tersedia"}</p>
      <h1>{wasDeleted ? "Transaksi dihapus" : "Transaksi tidak ditemukan"}</h1>
      <p>
        {wasDeleted
          ? `${deletedName} sudah dihapus dan ringkasan keuangan telah diperbarui.`
          : "Tautan ini mungkin sudah tidak berlaku atau data dummy telah dimuat ulang."}
      </p>
      <Link className="primary-button" href="/activity">
        Kembali ke Aktivitas
      </Link>
    </main>
  );
}

export function TransactionDetail({ id }: { id: string }) {
  const { deleteTransaction, transactions, updateTransaction } = useMockFinance();
  const transaction = transactions.find((item) => item.id === id);
  const [editDraft, setEditDraft] = useState<TransactionDraft | null>(null);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [deletedName, setDeletedName] = useState("");
  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const closeEdit = useCallback(() => setEditDraft(null), [setEditDraft]);
  const closeDelete = useCallback(() => {
    deletingRef.current = false;
    setDeleteOpen(false);
  }, [setDeleteOpen]);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => setSavedMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  if (!transaction) return <MissingTransaction deletedName={deletedName} />;
  const currentTransaction = transaction;

  const formattedDate = dateFormatter.format(
    new Date(`${currentTransaction.date}T00:00:00Z`),
  );

  function startEdit() {
    savingRef.current = false;
    setSavedMessage("");
    setEditDraft({
      account: currentTransaction.account,
      amount: currentTransaction.amount,
      category: currentTransaction.category,
      date: currentTransaction.date,
      description: currentTransaction.description,
      time: currentTransaction.time,
      type: currentTransaction.type,
    });
  }

  function saveEdit() {
    if (!editDraft || savingRef.current) return;

    savingRef.current = true;
    updateTransaction({
      ...currentTransaction,
      ...editDraft,
      description: editDraft.description.trim(),
      time: editDraft.time || currentTransaction.time,
    });
    setEditDraft(null);
    setSavedMessage("Perubahan transaksi berhasil disimpan.");
  }

  function confirmDelete() {
    if (deletingRef.current) return;

    deletingRef.current = true;
    setDeletedName(currentTransaction.description);
    deleteTransaction(currentTransaction.id);
    setDeleteOpen(false);
  }

  return (
    <main className="page page-enter">
      <Link className="back-link" href="/activity">
        <ArrowLeft aria-hidden="true" size={19} strokeWidth={2} />
        Aktivitas
      </Link>

      <section className="detail-hero" aria-labelledby="detail-title">
        <p className={`detail-type detail-type--${currentTransaction.type.toLowerCase()}`}>
          {currentTransaction.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
        </p>
        <h1 id="detail-title">{currentTransaction.description}</h1>
        <p className="detail-amount">
          {currentTransaction.type === "EXPENSE" ? "−" : "+"}
          {formatCurrency(currentTransaction.amount)}
        </p>
      </section>

      <dl className="detail-list">
        <div>
          <dt><CalendarDays aria-hidden="true" size={19} />Tanggal</dt>
          <dd>{formattedDate}, {currentTransaction.time}</dd>
        </div>
        <div>
          <dt><Tag aria-hidden="true" size={19} />Kategori</dt>
          <dd>{currentTransaction.category}</dd>
        </div>
        <div>
          <dt><Landmark aria-hidden="true" size={19} />Akun</dt>
          <dd>{currentTransaction.account}</dd>
        </div>
      </dl>

      <section className="detail-note">
        <h2>Catatan</h2>
        <p>{currentTransaction.note || "—"}</p>
      </section>

      <div className="detail-actions" aria-label="Tindakan transaksi">
        <button className="secondary-button" type="button" onClick={startEdit}>
          <Pencil aria-hidden="true" size={17} />Edit
        </button>
        <button
          className="danger-button danger-button--quiet"
          type="button"
          onClick={() => {
            deletingRef.current = false;
            setSavedMessage("");
            setDeleteOpen(true);
          }}
        >
          <Trash2 aria-hidden="true" size={17} />Hapus
        </button>
      </div>

      <p className="prototype-note">Data ini masih berupa contoh dan belum tersimpan permanen.</p>

      {editDraft ? (
        <TransactionConfirmationSheet
          draft={editDraft}
          onChange={setEditDraft}
          onClose={closeEdit}
          onSave={saveEdit}
          variant="edit"
        />
      ) : null}

      {isDeleteOpen ? (
        <DeleteTransactionDialog
          transaction={currentTransaction}
          onClose={closeDelete}
          onConfirm={confirmDelete}
        />
      ) : null}

      {savedMessage ? (
        <div className="toast toast--detail" role="status" aria-live="polite">
          <Check aria-hidden="true" size={17} />{savedMessage}
        </div>
      ) : null}
    </main>
  );
}
