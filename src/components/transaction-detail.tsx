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

import {
  useFinance,
  useTransactionDetail,
} from "@/components/finance-provider";
import { formatCurrency } from "@/lib/finance";
import {
  FinanceRequestError,
  type TransactionDraft,
} from "@/lib/finance-query";
import { DeleteTransactionDialog } from "./delete-transaction-dialog";
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
          : "Tautan ini mungkin sudah tidak berlaku atau transaksinya telah dihapus."}
      </p>
      <Link className="primary-button" href="/activity">
        Kembali ke Aktivitas
      </Link>
    </main>
  );
}

export function TransactionDetail({ id }: { id: string }) {
  const { deleteTransaction, updateTransaction } = useFinance();
  const transactionQuery = useTransactionDetail(id);
  const transaction = transactionQuery.data;
  const [editDraft, setEditDraft] = useState<TransactionDraft | null>(null);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editError, setEditError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [deletedName, setDeletedName] = useState("");
  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const closeEdit = useCallback(() => {
    if (!savingRef.current) setEditDraft(null);
  }, []);
  const closeDelete = useCallback(() => {
    if (!deletingRef.current) setDeleteOpen(false);
  }, []);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => setSavedMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  if (deletedName) return <MissingTransaction deletedName={deletedName} />;

  if (transactionQuery.isPending) {
    return (
      <main className="empty-page page-enter" role="status" aria-live="polite">
        <h1>Memuat transaksi</h1>
        <p>Mohon tunggu sebentar.</p>
      </main>
    );
  }

  if (
    transactionQuery.error instanceof FinanceRequestError &&
    transactionQuery.error.status === 404
  ) {
    return <MissingTransaction deletedName="" />;
  }

  if (transactionQuery.isError || !transaction) {
    return (
      <main className="empty-page page-enter" role="alert">
        <h1>Transaksi belum dapat dimuat</h1>
        <p>Periksa koneksi lalu coba lagi.</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => transactionQuery.refetch()}
        >
          Coba lagi
        </button>
      </main>
    );
  }

  const currentTransaction = transaction;
  const formattedDate = dateFormatter.format(
    new Date(`${currentTransaction.date}T00:00:00Z`),
  );

  function startEdit() {
    savingRef.current = false;
    setSavedMessage("");
    setEditError("");
    setEditDraft({
      accountId: currentTransaction.accountId,
      account: currentTransaction.account,
      amount: currentTransaction.amount,
      categoryId: currentTransaction.categoryId,
      category: currentTransaction.category,
      date: currentTransaction.date,
      description: currentTransaction.description,
      time: currentTransaction.time,
      type: currentTransaction.type,
    });
  }

  async function saveEdit() {
    if (!editDraft || savingRef.current) return;

    savingRef.current = true;
    setIsSaving(true);
    setEditError("");

    try {
      const updatedTransaction = await updateTransaction(id, {
        ...editDraft,
        description: editDraft.description.trim(),
      });
      savingRef.current = false;
      setIsSaving(false);
      setEditDraft(null);
      setSavedMessage(`${updatedTransaction.description} berhasil diperbarui.`);
    } catch {
      savingRef.current = false;
      setIsSaving(false);
      setEditError("Perubahan belum tersimpan. Coba lagi.");
    }
  }

  async function confirmDelete() {
    if (deletingRef.current) return;

    deletingRef.current = true;
    setIsDeleting(true);
    setDeleteError("");

    try {
      await deleteTransaction(currentTransaction.id);
      setDeletedName(currentTransaction.description);
      setDeleteOpen(false);
    } catch {
      deletingRef.current = false;
      setIsDeleting(false);
      setDeleteError("Transaksi belum terhapus. Coba lagi.");
    }
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
          <dd>
            {formattedDate}
            {currentTransaction.time ? `, ${currentTransaction.time}` : ""}
          </dd>
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

      <div className="detail-actions" aria-label="Tindakan transaksi">
        <button className="secondary-button" type="button" onClick={startEdit}>
          <Pencil aria-hidden="true" size={17} />Edit
        </button>
        <button
          className="danger-button danger-button--quiet"
          type="button"
          onClick={() => {
            deletingRef.current = false;
            setIsDeleting(false);
            setDeleteError("");
            setSavedMessage("");
            setDeleteOpen(true);
          }}
        >
          <Trash2 aria-hidden="true" size={17} />Hapus
        </button>
      </div>

      {editDraft ? (
        <TransactionConfirmationSheet
          draft={editDraft}
          error={editError}
          isSaving={isSaving}
          onChange={setEditDraft}
          onClose={closeEdit}
          onSave={saveEdit}
          variant="edit"
        />
      ) : null}

      {isDeleteOpen ? (
        <DeleteTransactionDialog
          transaction={currentTransaction}
          error={deleteError}
          isDeleting={isDeleting}
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
