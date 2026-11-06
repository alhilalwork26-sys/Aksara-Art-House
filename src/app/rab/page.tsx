import type { Metadata } from "next";
import { RabWorkspace } from "@/components/rab-workspace";

export const metadata: Metadata = {
  title: "RAB | Anima Libera Art",
  description: "Tampilan RAB minimalis untuk honor personel, kepanitiaan, dan biaya non-personel."
};

export default function RabPage() {
  return <RabWorkspace />;
}
