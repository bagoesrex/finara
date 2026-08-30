"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArrowRight,
  Check,
  LoaderCircle,
  MessageSquareText,
} from "lucide-react";

import type { AiFinanceAnswer } from "@/lib/ai-composer";
import { MAX_AI_COMPOSER_INPUT_LENGTH } from "@/lib/ai-composer";
import { fetchAiComposerResponse } from "@/lib/ai-query";
import { adaptAiTransactionPreview } from "@/lib/ai-transaction";
import type { FinanceAccount } from "@/lib/accounts";
import { parseTransactionInput } from "@/lib/finance";
import type {
  FinanceCategory,
  TransactionDraft,
} from "@/lib/finance-query";
import { getDateKeyInTimeZone } from "@/lib/transactions";
import { useFinance } from "@/components/finance-provider";
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

function canOfferManualEntry(input: string) {
  return (
    parseTransactionInput(input, getDateKeyInTimeZone(new Date())).status ===
    "ready"
  );
}

export function HomeComposer() {
  const { accounts, addTransaction, categories } = useFinance();
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState<AiFinanceAnswer | null>(null);
  const [preview, setPreview] = useState<TransactionDraft | null>(null);
  const [error, setError] = useState("");
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [isParsing, startParsing] = useTransition();
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (parsingRef.current) return;

    parsingRef.current = true;
    setAnswer(null);
    setError("");
    setShowManualFallback(false);

    startParsing(async () => {
      try {
        const result = await fetchAiComposerResponse(input);

        if (result.kind === "finance_answer") {
          setAnswer(result);
          return;
        }
        if (result.kind === "unsupported") {
          setError(result.message);
          return;
        }
        if (result.preview.status === "needs_input") {
          setError(result.preview.message);
          setShowManualFallback(true);
          return;
        }

        setSaveError("");
        setPreview({
          ...adaptAiTransactionPreview(result.preview),
          clientRequestId: crypto.randomUUID(),
        });
      } catch {
        setError("AI belum dapat memproses permintaan. Coba lagi.");
        setShowManualFallback(canOfferManualEntry(input));
      } finally {
        parsingRef.current = false;
      }
    });
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

  function chooseExample(example: string) {
    setInput(example);
    setAnswer(null);
    setError("");
    setShowManualFallback(false);
    inputRef.current?.focus();
  }

  return (
    <>
      <section className="composer-section" aria-labelledby="composer-title">
        <div className="composer-heading">
          <span>
            <MessageSquareText aria-hidden="true" size={18} />
          </span>
          <div>
            <h2 id="composer-title">Catat atau tanya</h2>
            <p>Misalnya makan 25rb atau saldo saya?</p>
          </div>
        </div>
        <form
          className="composer-form"
          onSubmit={handleSubmit}
          aria-busy={isParsing}
        >
          <label className="sr-only" htmlFor="finance-composer-input">
            Tulis transaksi atau pertanyaan
          </label>
          <input
            ref={inputRef}
            id="finance-composer-input"
            name="composerInput"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setAnswer(null);
              setError("");
              setShowManualFallback(false);
            }}
            placeholder="Kopi 18rb atau sisa budget makan?"
            autoComplete="off"
            disabled={isParsing}
            maxLength={MAX_AI_COMPOSER_INPUT_LENGTH}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "composer-error" : undefined}
          />
          <button
            type="submit"
            disabled={!input.trim() || isParsing}
            aria-label={isParsing ? "Finara sedang memproses" : "Proses dengan Finara"}
          >
            {isParsing ? (
              <LoaderCircle
                className="composer-spinner"
                aria-hidden="true"
                size={19}
              />
            ) : (
              <ArrowRight aria-hidden="true" size={19} />
            )}
          </button>
        </form>

        {answer ? (
          <div className="composer-answer" role="status" aria-live="polite">
            <span>{answer.label}</span>
            <strong>{answer.value}</strong>
            {answer.detail ? <p>{answer.detail}</p> : null}
          </div>
        ) : null}

        {error ? (
          <div className="composer-feedback">
            <p id="composer-error" className="form-error" role="alert">
              {error}
            </p>
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

        <div className="quick-examples" aria-label="Contoh input">
          {["Makan 25rb", "Saldo saya?", "Sisa budget makan?"].map(
            (example) => (
              <button
                type="button"
                disabled={isParsing}
                key={example}
                onClick={() => chooseExample(example)}
              >
                {example}
              </button>
            ),
          )}
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
          <Check aria-hidden="true" size={17} />
          {savedMessage}
        </div>
      ) : null}
    </>
  );
}
