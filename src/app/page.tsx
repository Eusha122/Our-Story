import { listPages } from "@/lib/db";
import Viewer from "@/components/Viewer";

export const dynamic = "force-dynamic";

export default function Home() {
  const pages = listPages();
  return <Viewer pages={pages} />;
}
