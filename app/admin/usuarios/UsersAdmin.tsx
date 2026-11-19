"use client";
// Usuarios y roles: tabla, alta, edición en línea, baja / reactivación. El servidor valida todo.
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, Button } from "@/components/ui";
import { ADMIN_LIMITS, ROLES, type Role, type User } from "@/lib/contracts";

const ROLE_LABEL: Record<Role, string> = { cliente: "Cliente", cocina: "Cocina", admin: "Administración" };

type Msg = { kind: "ok" | "error"; text: string } | null;
interface Draft {
  email: string;
  name: string;
  role: Role;
}

const EMPTY: Draft = { email: "", name: "", role: "cliente" };

function MsgLine({ msg }: { msg: Msg }) {
  return (
    <p className={`ad-msg ${msg?.kind === "ok" ? "ad-msg--ok" : "vc-error"}`} role="status" aria-live="polite">
      {msg?.text ?? ""}
    </p>
  );
}

export default function UsersAdmin({
  initialUsers,
  meId,
  demoPassword,
}: {
  initialUsers: User[];
  meId: number;
  demoPassword: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState<Draft>(EMPTY);
  const [formMsg, setFormMsg] = useState<Msg>(null);
  const [listMsg, setListMsg] = useState<Msg>(null);
  const [editing, setEditing] = useState<(Draft & { id: number }) | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<string>, setMsg: (m: Msg) => void): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    let okText: string;
    try {
      okText = await action();
    } catch (err) {
      const e = err as Error & { status?: number };
      setBusy(false);
      // Sin sesión o ya sin rol admin (p. ej. otro admin lo degradó): vuelve a la entrada del personal.
      if (e.status === 401 || e.status === 403) {
        router.replace("/personal");
        return false;
      }
      setMsg({ kind: "error", text: e.message || "No se pudo guardar. Probá de nuevo." });
      return false;
    }
    // La acción ya salió bien: si falla recargar la lista, no se informa como error de la acción.
    try {
      const { users: fresh } = await api<{ users: User[] }>("/api/admin/users");
      setUsers(fresh);
      setMsg({ kind: "ok", text: okText });
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 401 || e.status === 403) router.replace("/personal");
      else setMsg({ kind: "ok", text: `${okText} (No pudimos actualizar la lista: recargá la página.)` });
    } finally {
      setBusy(false);
    }
    return true;
  }

  async function create(ev: FormEvent) {
    ev.preventDefault();
    const ok = await run(async () => {
      const { user } = await api<{ user: User }>("/api/admin/users", { json: form });
      return `Listo: ${user.name} ya está dado de alta.`;
    }, setFormMsg);
    if (ok) setForm(EMPTY);
  }

  async function saveEdit() {
    if (!editing) return;
    const before = users.find((u) => u.id === editing.id);
    const patch: Partial<Draft> = {};
    if (!before || editing.email !== before.email) patch.email = editing.email;
    if (!before || editing.name !== before.name) patch.name = editing.name;
    if (!before || editing.role !== before.role) patch.role = editing.role;
    const ok = await run(async () => {
      const { user } = await api<{ user: User }>(`/api/admin/users/${editing.id}`, { method: "PATCH", json: patch });
      return `Guardamos los cambios de ${user.name}.`;
    }, setListMsg);
    if (ok) setEditing(null);
  }

  async function deactivate(u: User) {
    await run(async () => {
      await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
      return `${u.name} quedó de baja: ya no puede entrar.`;
    }, setListMsg);
    setConfirmId(null);
  }

  async function reactivate(u: User) {
    await run(async () => {
      await api(`/api/admin/users/${u.id}`, { method: "PATCH", json: { active: true } });
      return `${u.name} está activo de nuevo.`;
    }, setListMsg);
  }

  return (
    <>
      <div className="ad-head">
        <h1 className="ad-title">Usuarios y roles</h1>
      </div>

      <section className="adu-new" aria-labelledby="adu-new-title">
        <h2 className="ad-section-title" id="adu-new-title">Dar de alta</h2>
        <form className="ad-form" onSubmit={create}>
          <label className="ad-field">
            Email
            <input
              type="email"
              value={form.email}
              maxLength={ADMIN_LIMITS.emailMax}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nombre@dominio.com"
              required
            />
          </label>
          <label className="ad-field">
            Nombre
            <input
              value={form.name}
              maxLength={ADMIN_LIMITS.userNameMax}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre y apellido"
              required
            />
          </label>
          <label className="ad-field">
            Rol
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={busy}>
            Dar de alta
          </Button>
        </form>
        <p className="adu-note">
          El personal nuevo (cocina o administración) entra con la contraseña de demo <code>{demoPassword}</code>. Los
          clientes entran con Google, sin contraseña.
        </p>
        <MsgLine msg={formMsg} />
      </section>

      <section className="adu-new" aria-labelledby="adu-list-title">
        <h2 className="ad-section-title" id="adu-list-title">Todos los usuarios</h2>
        <MsgLine msg={listMsg} />
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === meId;
                const ed = editing?.id === u.id ? editing : null;
                const rowCls = [ed && "adu-row--edit", !u.active && "ad-row--off"].filter(Boolean).join(" ");
                return (
                  <tr key={u.id} className={rowCls || undefined}>
                    <td>
                      {ed ? (
                        <input
                          className="adu-cell-input"
                          aria-label="Nombre"
                          value={ed.name}
                          maxLength={ADMIN_LIMITS.userNameMax}
                          onChange={(e) => setEditing({ ...ed, name: e.target.value })}
                        />
                      ) : (
                        <strong>{u.name}</strong>
                      )}
                      {isMe && !ed && <span className="vc-badge adu-me">vos</span>}
                    </td>
                    <td>
                      {ed ? (
                        <input
                          className="adu-cell-input"
                          type="email"
                          aria-label="Email"
                          value={ed.email}
                          maxLength={ADMIN_LIMITS.emailMax}
                          onChange={(e) => setEditing({ ...ed, email: e.target.value })}
                        />
                      ) : (
                        <span className="adu-email">{u.email}</span>
                      )}
                    </td>
                    <td>
                      {ed ? (
                        <select
                          className="adu-cell-input"
                          aria-label="Rol"
                          value={ed.role}
                          disabled={isMe}
                          title={isMe ? "No podés quitarte el rol de administración" : undefined}
                          onChange={(e) => setEditing({ ...ed, role: e.target.value as Role })}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        ROLE_LABEL[u.role]
                      )}
                    </td>
                    <td>
                      <span className={`vc-badge ${u.active ? "vc-badge--green" : ""}`}>{u.active ? "Activo" : "De baja"}</span>
                    </td>
                    <td>
                      <div className="ad-actions">
                        {ed ? (
                          <>
                            <Button size="sm" onClick={saveEdit} disabled={busy}>
                              Guardar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
                              Cancelar
                            </Button>
                          </>
                        ) : confirmId === u.id ? (
                          <span className="adu-confirm">
                            ¿Dar de baja a {u.name}?
                            <Button size="sm" variant="danger" onClick={() => deactivate(u)} disabled={busy}>
                              Sí, dar de baja
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)} disabled={busy}>
                              No
                            </Button>
                          </span>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => {
                                setConfirmId(null);
                                setListMsg(null);
                                setEditing({ id: u.id, email: u.email, name: u.name, role: u.role });
                              }}
                            >
                              Editar
                            </Button>
                            {u.active ? (
                              !isMe && (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={busy}
                                  onClick={() => {
                                    setEditing(null);
                                    setConfirmId(u.id);
                                  }}
                                >
                                  Dar de baja
                                </Button>
                              )
                            ) : (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => reactivate(u)}>
                                Reactivar
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
