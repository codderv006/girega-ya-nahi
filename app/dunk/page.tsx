import type { Metadata } from "next";
import { DunkFlow } from "@/components/DunkFlow";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: `Dunk Analysis · ${APP_NAME}` };

export default function DunkPage() {
  return <DunkFlow />;
}
