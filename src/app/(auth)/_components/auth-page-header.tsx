import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type AuthPageHeaderProps = {
  backHref?: string;
  backLabel?: string;
  description: string;
  eyebrow: string;
  title: string;
};

export function AuthPageHeader({
  backHref = "/welcome",
  backLabel = "Kembali",
  description,
  eyebrow,
  title,
}: AuthPageHeaderProps) {
  return (
    <header className="auth-page-header">
      <Link className="auth-back-link" href={backHref}>
        <ArrowLeft aria-hidden="true" size={18} />
        {backLabel}
      </Link>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
