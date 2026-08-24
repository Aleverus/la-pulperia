import type { PublicContextNote } from "@/lib/operations";

export function PublicContextNotes({ notes }: { notes: PublicContextNote[] }) {
  if (notes.length === 0) return null;
  return (
    <aside className="context-notes" aria-labelledby="context-notes-title">
      <h2 id="context-notes-title">Contexto público</h2>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>{note.body}</li>
        ))}
      </ul>
    </aside>
  );
}
