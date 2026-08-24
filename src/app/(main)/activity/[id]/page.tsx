import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Landmark, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { transactions } from "@/lib/mock-data";

type TransactionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return transactions.map(({ id }) => ({ id }));
}

export async function generateMetadata({
  params,
}: TransactionDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const transaction = transactions.find((item) => item.id === id);
  return { title: transaction?.description ?? "Transaksi" };
}

export default async function TransactionDetailPage({
  params,
}: TransactionDetailPageProps) {
  const { id } = await params;
  const transaction = transactions.find((item) => item.id === id);

  if (!transaction) notFound();

  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${transaction.date}T00:00:00`));

  return (
    <main className="page page-enter">
      <Link className="back-link" href="/activity">
        <ArrowLeft aria-hidden="true" size={19} strokeWidth={2} />
        Aktivitas
      </Link>

      <section className="detail-hero" aria-labelledby="detail-title">
        <p className={`detail-type detail-type--${transaction.type.toLowerCase()}`}>
          {transaction.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
        </p>
        <h1 id="detail-title">{transaction.description}</h1>
        <p className="detail-amount">
          {transaction.type === "EXPENSE" ? "−" : "+"}
          {formatCurrency(transaction.amount)}
        </p>
      </section>

      <dl className="detail-list">
        <div>
          <dt><CalendarDays aria-hidden="true" size={19} />Tanggal</dt>
          <dd>{formattedDate}, {transaction.time}</dd>
        </div>
        <div>
          <dt><Tag aria-hidden="true" size={19} />Kategori</dt>
          <dd>{transaction.category}</dd>
        </div>
        <div>
          <dt><Landmark aria-hidden="true" size={19} />Akun</dt>
          <dd>{transaction.account}</dd>
        </div>
      </dl>

      {transaction.note ? (
        <section className="detail-note">
          <h2>Catatan</h2>
          <p>{transaction.note}</p>
        </section>
      ) : null}

      <p className="prototype-note">Data ini masih berupa contoh dan belum tersimpan permanen.</p>
    </main>
  );
}
