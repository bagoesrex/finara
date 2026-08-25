import type { Metadata } from "next";
import { ProfileDashboard } from "@/components/profile-dashboard";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return <ProfileDashboard />;
}
