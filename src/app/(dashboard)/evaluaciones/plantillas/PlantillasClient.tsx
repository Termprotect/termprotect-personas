"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Pencil, Archive, ArchiveRestore, Trash2, X } from "lucide-react";

type Question = { id: string; label: string; help?: string };
type Item = {
  id: string;
  name: string;
  description: string | null;
  questions: Question[];
  archived: boolean;
  usage: number;
};

export default function PlantillasClient({
  items,
  includeArchived,
}: {
  items: Item[];
  includeArchived: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());

  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function toggleArchive(t: Item) {
    setBusyId(t.id);
    setErr(null);
    try {
      const res = await fetch(`/api/eval-templates/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !t.archived }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Error");
      } else {
        refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function remove(t: Item) {
    if (!confirm(`¿Eliminar plantilla "${t.name}"?`)) return;
    setBusyId(t.id);
    setErr(null);
    try {
      const res = await fetch(`/api/eval-templates/${t.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Error");
      } else {
        refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-sm rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Nueva plantilla
        </button>
        <Link
          href={
            includeArchived
              ? "/evaluaciones/plantillas"
              : "/evaluaciones/plantillas?archived=1"
          }
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {includeArchived ? "Ocultar archivadas" : "Ver archivadas"}
        </Link>
      </div>

      {err && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {err}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-background rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No hay plantillas. Crea la primera para ciclos por pares.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((t) => (
            <div
              key={t.id}
              className={`bg-background rounded-xl border p-4 ${
                t.archived ? "border-border opacity-70" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {t.name}
                  </p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.description}
                    </p>
                  )}
                </div>
                {t.archived && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                    ARCHIVADA
                  </span>
                )}
              </div>
              <ul className="mt-3 text-xs text-muted-foreground space-y-0.5">
                {t.questions.map((q) => (
                  <li key={q.id} className="flex items-start gap-1.5">
                    <span className="text-muted-foreground">·</span>
                    <span>{q.label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{t.usage} evaluación(es)</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing(t)}
                    disabled={busyId === t.id}
                    className="p-1.5 text-muted-foreground hover:bg-muted rounded disabled:opacity-50"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleArchive(t)}
                    disabled={busyId === t.id}
                    className="p-1.5 text-muted-foreground hover:bg-muted rounded disabled:opacity-50"
                    title={t.archived ? "Restaurar" : "Archivar"}
                  >
                    {t.archived ? (
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    ) : (
                      <Archive className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {t.usage === 0 && (
                    <button
                      onClick={() => remove(t)}
                      disabled={busyId === t.id}
                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded disabled:opacity-50"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <TemplateEditor
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            refresh();
          }}
        />
      )}
      {editing && (
        <TemplateEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function TemplateEditor({
  initial,
  onClose,
  onDone,
}: {
  initial?: Item;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [questions, setQuestions] = useState<Question[]>(
    initial?.questions.length
      ? initial.questions
      : [{ id: "", label: "", help: "" }]
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lockedQuestions = (initial?.usage ?? 0) > 0;

  function slugify(s: string): string {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_\s]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 40);
  }

  function setQ(i: number, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  function addQ() {
    setQuestions((qs) => [...qs, { id: "", label: "", help: "" }]);
  }

  function removeQ(i: number) {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        questions: questions.map((q) => ({
          id: (q.id || slugify(q.label)).trim(),
          label: q.label.trim(),
          help: q.help?.trim() || undefined,
        })),
      };
      const method = initial ? "PATCH" : "POST";
      const url = initial
        ? `/api/eval-templates/${initial.id}`
        : `/api/eval-templates`;
      const body = initial && lockedQuestions
        ? { name: payload.name, description: payload.description }
        : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Error");
      } else {
        onDone();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl max-w-2xl w-full p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">
            {initial ? "Editar plantilla" : "Nueva plantilla"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Presupuesto — Creación de ofertas"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>

          {lockedQuestions && (
            <div className="p-2 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning">
              Esta plantilla ya tiene evaluaciones. Solo puedes editar el
              nombre y la descripción.
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Preguntas
              </label>
              {!lockedQuestions && (
                <button
                  onClick={addQ}
                  className="text-xs text-sky-700 hover:text-sky-900"
                >
                  + Añadir
                </button>
              )}
            </div>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div
                  key={i}
                  className="border border-border rounded-lg p-2 space-y-1.5"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={q.label}
                        disabled={lockedQuestions}
                        onChange={(e) => setQ(i, { label: e.target.value })}
                        placeholder="Etiqueta (p. ej. Comunicación)"
                        className="w-full px-2 py-1 border border-border rounded text-sm disabled:bg-secondary"
                      />
                      <input
                        type="text"
                        value={q.help ?? ""}
                        disabled={lockedQuestions}
                        onChange={(e) => setQ(i, { help: e.target.value })}
                        placeholder="Ayuda (opcional)"
                        className="w-full px-2 py-1 border border-border rounded text-xs text-muted-foreground mt-1 disabled:bg-secondary"
                      />
                      <input
                        type="text"
                        value={q.id}
                        disabled={lockedQuestions}
                        onChange={(e) =>
                          setQ(i, {
                            id: e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9_]/g, "_"),
                          })
                        }
                        placeholder="id técnico (se autogenera si lo dejas vacío)"
                        className="w-full px-2 py-1 border border-border rounded text-xs font-mono text-muted-foreground mt-1 disabled:bg-secondary"
                      />
                    </div>
                    {!lockedQuestions && questions.length > 1 && (
                      <button
                        onClick={() => removeQ(i)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {err && (
            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
              {err}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg"
            >
              Cancelar
            </button>
            <button
              disabled={busy}
              onClick={submit}
              className="px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg"
            >
              {busy ? "Guardando…" : initial ? "Guardar" : "Crear"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
