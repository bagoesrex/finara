"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  LoaderCircle,
  MessageSquareText,
} from "lucide-react";

import { useFinance } from "@/components/finance-provider";
import {
  adaptAiTransactionPreview,
  MAX_AI_TRANSACTION_INPUT_LENGTH,
} from "@/lib/ai-transaction";
import { fetchAiTransactionPreview } from "@/lib/ai-query";
import { parseTransactionInput } from "@/lib/finance";
import type {
  FinanceCategory,
  TransactionDraft,
} from "@/lib/finance-query";
import type { FinanceAccount } from "@/lib/accounts";
import { getDateKeyInTimeZone } from "@/lib/transactions";
import { TransactionConfirmationSheet } from "./transaction-confirmation-sheet";

function createManualDraft(
  input: string,
  accounts: FinanceAccount[],
  categories: FinanceCategory[],
): TransactionDraft | null {
  const referenceDate = getDateKeyInTimeZone(new Date());
  const parsed = parseTransactionInput(input, referenceDate);
  const transaction =
    parsed.status === "ready"
      ? parsed.transaction
      : {
          amount: 0,
          category: "Other",
          date: referenceDate,
          description: input.trim() || "Transaksi",
          type: "EXPENSE" as const,
        };
  const account = accounts[0];
  const category =
    categories.find(
      (item) =>
        item.type === transaction.type && item.name === transaction.category,
    ) ??
    categories.find(
      (item) => item.type === transaction.type && item.name === "Other",
    ) ??
    categories.find((item) => item.type === transaction.type);

  if (!account || !category) return null;

  return {
    ...transaction,
    accountId: account.id,
    account: account.name,
    categoryId: category.id,
    category: category.name,
    clientRequestId: crypto.randomUUID(),
  };
}

export function HomeTransactionComposer() {
  const { accounts, addTransaction, categories } = useFinance();
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<TransactionDraft | null>(null);
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const parsingRef = useRef(false);
  const savingRef = useRef(false);
  const closePreview = useCallback(() => {
    if (!savingRef.current) setPreview(null);
  }, []);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => setSavedMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  async function handleParse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (parsingRef.current) return;

    parsingRef.current = true;
    setIsParsing(true);
    setError("");
    setShowManualFallback(false);

    try {
      const result = await fetchAiTransactionPreview(input);
      if (result.status === "needs_input") {
        setError(result.message);
        setShowManualFallback(true);
        return;
      }

      setSaveError("");
      setPreview({
        ...adaptAiTransactionPreview(result),
        clientRequestId: crypto.randomUUID(),
      });
    } catch {
      setError("AI belum dapat memproses transaksi. Coba lagi atau isi manual.");
      setShowManualFallback(true);
    } finally {
      parsingRef.current = false;
      setIsParsing(false);
    }
  }

  function openManualEntry() {
    const draft = createManualDraft(input, accounts, categories);
    if (!draft) {
      setError("Akun atau kategori belum tersedia.");
      return;
    }

    setError("");
    setShowManualFallback(false);
    setSaveError("");
    setPreview(draft);
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
    <>
      <section className="composer-section" aria-labelledby="composer-title">
        <div className="composer-heading">
          <span><MessageSquareText aria-hidden="true" size={18} /></span>
          <div>
            <h2 id="composer-title">Catat dengan kalimat biasa</h2>
            <p>Coba “makan ayam 25rb”</p>
          </div>
        </div>
        <form
          className="composer-form"
          onSubmit={handleParse}
          aria-busy={isParsing}
        >
          <label className="sr-only" htmlFor="quick-transaction">Tulis transaksi</label>
          <input
            ref={inputRef}
            id="quick-transaction"
            name="transaction"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (error) setError("");
              if (showManualFallback) setShowManualFallback(false);
            }}
            placeholder="Contoh: kopi 18rb…"
            autoComplete="off"
            disabled={isParsing}
            maxLength={MAX_AI_TRANSACTION_INPUT_LENGTH}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "composer-error" : undefined}
          />
          <button
            type="submit"
            disabled={!input.trim() || isParsing}
            aria-label={isParsing ? "Memproses transaksi" : "Tinjau transaksi"}
          >
            {isParsing ? (
              <LoaderCircle className="composer-spinner" aria-hidden="true" size={19} />
            ) : (
              <ArrowRight aria-hidden="true" size={19} />
            )}
          </button>
        </form>
        {error ? (
          <div className="composer-feedback">
            <p id="composer-error" className="form-error" role="alert">{error}</p>
            {showManualFallback ? (
              <button
                className="section-action"
                type="button"
                onClick={openManualEntry}
              >
                Isi manual
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="quick-examples" aria-label="Contoh transaksi">
          {["Makan 25rb", "Grab 22rb", "Gaji masuk 5jt"].map((example) => (
            <button
              type="button"
              disabled={isParsing}
              key={example}
              onClick={() => {
                setInput(example);
                setError("");
                setShowManualFallback(false);
                inputRef.current?.focus();
              }}
            >
              {example}
            </button>
          ))}
        </div>
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
    </>
  );
}
