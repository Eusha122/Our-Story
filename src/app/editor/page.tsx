import { listPages } from "@/lib/db";
import Editor from "@/components/editor/Editor";

export const dynamic = "force-dynamic";

export default function EditorPage() {
  const pages = listPages();
  return <Editor initialPages={pages} />;
}
