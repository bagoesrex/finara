import type { Metadata } from "next";
import { TransactionDetail } from "@/components/transaction-detail";

type TransactionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = { title: "Transaksi" };

export default async function TransactionDetailPage({
  params,
}: TransactionDetailPageProps) {
  const { id } = await params;
  return <TransactionDetail id={id} />;
}
