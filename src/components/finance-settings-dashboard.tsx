"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  CircleHelp,
  Pencil,
  Tag,
  WalletCards,
} from "lucide-react";
import { AccountRenameSheet } from "@/components/account-rename-sheet";
import { PageHeader } from "@/components/page-header";
import { useFinance } from "@/components/finance-provider";
import { accountTypeLabels } from "@/lib/accounts";
import { formatSignedCurrency } from "@/lib/finance";

function CategoryList({ categories }: { categories: readonly string[] }) {
  return (
    <ul className="category-list" role="list">
      {categories.map((category) => (
        <li key={category}>
          <span aria-hidden="true"><Tag size={17} /></span>
          {category}
        </li>
      ))}
    </ul>
  );
}

export function FinanceSettingsDashboard() {
  const { accounts, categories, renameAccount } = useFinance();
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const editingAccount = accounts.find(({ id }) => id === editingAccountId);
  const totalBalance = accounts.reduce(
    (total, account) => total + account.currentBalance,
    0,
  );
  const closeRename = useCallback(() => setEditingAccountId(null), []);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => setSavedMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  function saveAccountName(id: string, name: string) {
    renameAccount(id, name);
    setEditingAccountId(null);
    setSavedMessage("Nama akun diperbarui untuk sesi ini.");
  }

  return (
    <main className="page finance-settings-page page-enter">
      <Link className="back-link" href="/profile">
        <ChevronLeft aria-hidden="true" size={18} />
        Kembali ke profil
      </Link>
      <PageHeader
        eyebrow="Keuangan"
        title="Akun & kategori"
        description="Atur nama akun dan lihat kategori yang tersedia untuk mencatat transaksi."
      />

      <section id="accounts" className="section-block finance-section" aria-labelledby="accounts-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Akun</p>
            <h2 id="accounts-title">Sumber dana</h2>
          </div>
          <span className="section-count">{accounts.length} akun</span>
        </div>

        {accounts.length > 0 ? (
          <>
            <div className="account-total">
              <span>Saldo gabungan</span>
              <strong>{formatSignedCurrency(totalBalance)}</strong>
            </div>
            <ul className="account-list" role="list">
              {accounts.map((account) => (
                  <li key={account.id}>
                    <span className="finance-row-icon" aria-hidden="true">
                      <WalletCards size={19} />
                    </span>
                    <div className="account-copy">
                      <strong>{account.name}</strong>
                      <small>{accountTypeLabels[account.type]}</small>
                    </div>
                    <div className="account-balance">
                      <strong>{formatSignedCurrency(account.currentBalance)}</strong>
                      <button
                        type="button"
                        onClick={() => setEditingAccountId(account.id)}
                        aria-label={`Ubah nama akun ${account.name}`}
                      >
                        <Pencil aria-hidden="true" size={16} />
                        Ubah
                      </button>
                    </div>
                  </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="finance-empty" role="status">
            Belum ada akun yang dapat dikelola.
          </div>
        )}
      </section>

      <section id="categories" className="section-block finance-section" aria-labelledby="categories-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Kategori bawaan</p>
            <h2 id="categories-title">Untuk setiap transaksi</h2>
          </div>
        </div>
        <div className="category-group">
          <h3>Pengeluaran</h3>
          <CategoryList
            categories={categories
              .filter(({ type }) => type === "EXPENSE")
              .map(({ name }) => name)}
          />
        </div>
        <div className="category-group">
          <h3>Pemasukan</h3>
          <CategoryList
            categories={categories
              .filter(({ type }) => type === "INCOME")
              .map(({ name }) => name)}
          />
        </div>
      </section>

      <section className="support-note finance-note" aria-label="Batas pengaturan">
        <CircleHelp aria-hidden="true" size={20} />
        <div>
          <h2>Pengaturan masih terbatas</h2>
          <p>
            Perubahan nama akun hanya berlaku sampai halaman dimuat ulang.
            Kategori belum bisa diubah sampai aturan pengelolaannya ditetapkan.
          </p>
        </div>
      </section>

      {editingAccount ? (
        <AccountRenameSheet
          account={editingAccount}
          accounts={accounts}
          onClose={closeRename}
          onSave={saveAccountName}
        />
      ) : null}

      {savedMessage ? (
        <div className="toast" role="status" aria-live="polite">
          <Check aria-hidden="true" size={17} />
          {savedMessage}
        </div>
      ) : null}
    </main>
  );
}
