"use client";

import { Fragment, useState, type FormEvent } from "react";
import { api, Button, Card } from "@/components/ui";
import { ADMIN_LIMITS, ROLES, type Role, type User } from "@/lib/contracts";

const ROLE_LABEL: Record<Role, string> = { cliente: "Cliente", cocina: "Cocina", admin: "Administración" };
const isStaff = (r: Role) => r === "cocina" || r === "admin";
type Filter = Role | "todos";

interface Draft {
  email: string;
  name: string;
  role: Role;
  password: string;
}
const emptyDraft: Draft = { email: "", name: "", role: "cliente", password: "" };

/** Arma el cuerpo: la contraseña solo va si es personal y no está vacía. */
function toBody(d: Draft) {
  const body: Record<string, unknown> = { email: d.email, name: d.name, role: d.role };
  if (isStaff(d.role) && d.password) body.password = d.password;
  return body;
}

function sortUsers(list: User[]): User[] {
  return [...list].sort(
    (a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name, "es") || a.id - b.id,
  );
}

function UserFields({ draft, onChange, isNew, lockRole }: { draft: Draft; onChange: (d: Draft) => void; isNew: boolean; lockRole?: boolean }) {
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => onChange({ ...draft, [k]: e.target.value });
  return (
    <div className="au-grid">
      <label className="ad-field">
        Nombre
        <input value={draft.name} onChange={set("name")} maxLength={ADMIN_LIMITS.userName.max} required autoComplete="off" />
      </label>
      <label className="ad-field">
        Email
        <input type="email" value={draft.email} onChange={set("email")} maxLength={ADMIN_LIMITS.email.max} required autoComplete="off" />
      </label>
      <label className="ad-field">
        Rol
        <select value={draft.role} onChange={set("role")} disabled={lockRole}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </label>
      {isStaff(draft.role) && (
        <label className="ad-field">
          {isNew ? "Contraseña" : "Nueva contraseña (opcional)"}
          <input
            type="password"
            value={draft.password}
            onChange={set("password")}
            maxLength={ADMIN_LIMITS.password.max}
            autoComplete="new-password"
          />
          <span className="au-note">
            {isNew
              ? "Si la dejás vacía se usa la de demo."
              : "Si la dejás vacía queda la actual (o la de demo si no tenía)."}
          </span>
        </label>
      )}
    </div>
  );
}

export default function UsersAdmin({ initialUsers, meId }: { initialUsers: User[]; meId: number }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [filter, setFilter] = useState<Filter>("todos");
  const [showNew, setShowNew] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft);
  const [newError, setNewError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const replace = (u: User) => setUsers((list) => sortUsers(list.map((x) => (x.id === u.id ? u : x))));
  const visible = filter === "todos" ? users : users.filter((u) => u.role === filter);
  const count = (f: Filter) => (f === "todos" ? users.length : users.filter((u) => u.role === f).length);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNewError(null);
    try {
      const { user } = await api<{ user: User }>("/api/admin/users", { json: toBody(newDraft) });
      setUsers((list) => sortUsers([...list, user]));
      setNewDraft(emptyDraft);
      setShowNew(false);
      setNotice(`Listo: diste de alta a ${user.name}.`);
    } catch (err) {
      setNewError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(u: User) {
    setEditId(u.id);
    setConfirmId(null);
    setRowError(null);
    setEditDraft({ email: u.email, name: u.name, role: u.role, password: "" });
  }

  async function patch(id: number, body: Record<string, unknown>, ok: string) {
    setBusy(true);
    setRowError(null);
    try {
      const { user } = await api<{ user: User }>(`/api/admin/users/${id}`, { method: "PATCH", json: body });
      replace(user);
      setEditId(null);
      setNotice(ok.replace("{name}", user.name));
    } catch (err) {
      setRowError({ id, msg: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: number) {
    setBusy(true);
    setRowError(null);
    try {
      const { user } = await api<{ user: User }>(`/api/admin/users/${id}`, { method: "DELETE" });
      replace(user);
      setConfirmId(null);
      setNotice(`${user.name} quedó dado de baja: ya no puede entrar.`);
    } catch (err) {
      setRowError({ id, msg: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="ad-head">
        <h1>Usuarios y roles</h1>
        {!showNew && (
          <Button onClick={() => { setShowNew(true); setNewError(null); setNotice(null); }}>+ Nuevo usuario</Button>
        )}
      </div>

      {notice && <p className="ad-ok au-msg" role="status">{notice}</p>}

      {showNew && (
        <Card className="au-card">
          <h2>Nuevo usuario</h2>
          <form className="ad-form" onSubmit={create}>
            <UserFields draft={newDraft} onChange={setNewDraft} isNew />
            {newError && <p className="vc-error au-msg" role="alert">{newError}</p>}
            <div className="ad-actions">
              <Button type="button" variant="secondary" onClick={() => { setShowNew(false); setNewDraft(emptyDraft); setNewError(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>Dar de alta</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="au-filters" role="group" aria-label="Filtrar por rol">
        {(["todos", ...ROLES] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`st-chip ${filter === f ? "st-chip--on au-chip--on" : ""}`}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === "todos" ? "Todos" : ROLE_LABEL[f]}
            <span className="au-count">{count(f)}</span>
          </button>
        ))}
      </div>

      <Card className="au-card">
        <div className="au-tablewrap">
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
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="au-empty">No hay usuarios con ese rol.</td>
                </tr>
              )}
              {visible.map((u) => {
                const me = u.id === meId;
                const err = rowError?.id === u.id ? rowError.msg : null;
                return (
                  <Fragment key={u.id}>
                    <tr className={u.active ? "" : "ad-row--off"}>
                      <td>
                        <span className="au-name">{u.name}</span>
                        {me && <span className="vc-badge vc-badge--green au-me">Vos</span>}
                      </td>
                      <td className="au-email">{u.email}</td>
                      <td>
                        <span className={`vc-badge ${isStaff(u.role) ? "vc-badge--green" : ""}`}>{ROLE_LABEL[u.role]}</span>
                      </td>
                      <td>
                        <span className={`vc-badge ${u.active ? "vc-badge--green" : ""}`}>{u.active ? "Activo" : "Dado de baja"}</span>
                      </td>
                      <td>
                        <div className="au-rowactions">
                          {editId !== u.id && (
                            <Button size="sm" variant="secondary" onClick={() => startEdit(u)} disabled={busy}>Editar</Button>
                          )}
                          {u.active && !me && (
                            <Button size="sm" variant="danger" onClick={() => { setConfirmId(u.id); setEditId(null); setRowError(null); }} disabled={busy}>
                              Dar de baja
                            </Button>
                          )}
                          {!u.active && (
                            <Button size="sm" onClick={() => patch(u.id, { active: true }, "{name} está activo de nuevo.")} disabled={busy}>
                              Reactivar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {confirmId === u.id && (
                      <tr className="au-confirm">
                        <td colSpan={5}>
                          <div className="au-confirm__box">
                            <p>¿Dar de baja a {u.name}? No va a poder entrar y se cierran sus sesiones abiertas.</p>
                            <div className="ad-actions">
                              <Button size="sm" variant="secondary" onClick={() => setConfirmId(null)}>No, volver</Button>
                              <Button size="sm" variant="danger" onClick={() => deactivate(u.id)} disabled={busy}>Sí, dar de baja</Button>
                            </div>
                          </div>
                          {err && <p className="vc-error au-msg" role="alert">{err}</p>}
                        </td>
                      </tr>
                    )}

                    {editId === u.id && (
                      <tr className="au-edit">
                        <td colSpan={5}>
                          <form
                            className="ad-form"
                            onSubmit={(e) => { e.preventDefault(); patch(u.id, toBody(editDraft), "Guardamos los cambios de {name}."); }}
                          >
                            <UserFields draft={editDraft} onChange={setEditDraft} isNew={false} lockRole={me} />
                            {me && <p className="au-note">No podés quitarte el rol de administración.</p>}
                            {editDraft.role !== u.role && (
                              <p className="au-note">Al cambiar el rol se cierran sus sesiones abiertas.</p>
                            )}
                            {err && <p className="vc-error au-msg" role="alert">{err}</p>}
                            <div className="ad-actions">
                              <Button type="button" size="sm" variant="secondary" onClick={() => { setEditId(null); setRowError(null); }}>
                                Cancelar
                              </Button>
                              <Button type="submit" size="sm" disabled={busy}>Guardar</Button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                    {err && confirmId !== u.id && editId !== u.id && (
                      <tr>
                        <td colSpan={5}><p className="vc-error au-msg" role="alert">{err}</p></td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
