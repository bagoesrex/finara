import type { Metadata } from "next";
import { TransactionDetail } from "@/components/transaction-detail";
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
  return <TransactionDetail id={id} />;
}
