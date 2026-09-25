import { useEffect, useState } from "react";
import {
  listAdminSchedules,
  createSchedule,
} from "../../services/scheduleService";
import { assignGuide } from "../../services/assignmentService";
import { listActiveRoutes } from "../../services/routeService";
import { listAllProfiles } from "../../services/profileService";
import Button from "../../components/common/Button";
import { Feedback, Modal } from "../../components/m4/Feedback";
import {
  validateSchedule,
  canAssign,
  isUpcoming,
  thaiToday,
  formatDate,
  formatTime,
  statusLabel,
} from "../../services/m4/rules";
const scheduleStatusColors = {
  OPEN: "bg-green-100 text-green-800 border-green-200",
  FULL: "bg-amber-100 text-amber-900 border-amber-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  COMPLETED: "bg-blue-100 text-blue-800 border-blue-200",
};
const emptyForm = {
  route_id: "",
  tour_date: "",
  start_time: "",
  end_time: "",
  max_participants: 1,
};
const fieldStyle =
  "w-full rounded-input border border-border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary";
export default function AdminSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [guideId, setGuideId] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [actionError, setActionError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([listAdminSchedules(), listActiveRoutes(), listAllProfiles()])
      .then(([s, r, g]) => {
        if (!active) return;
        if (!s.success || !r.success || !g.success) {
          setError(
            "โหลดตาราง เส้นทาง หรือรายชื่อไกด์ไม่สำเร็จ กรุณาลองอีกครั้ง",
          );
          return;
        }
        setSchedules(s.data || []);
        setRoutes(r.data || []);
        setGuides(
          (g.data || []).filter(
            (x) => x.role === "GUIDE" && x.account_status === "ACTIVE",
          ),
        );
        setError("");
      })
      .catch(() => {
        if (active) setError("เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  function open(kind, schedule) {
    setActionError("");
    setErrors({});
    setSuccess("");
    setModal(kind);
    setSelected(schedule);
    setForm(emptyForm);
    const assignment = Array.isArray(schedule?.guide_assignments)
      ? schedule.guide_assignments[0]
      : schedule?.guide_assignments;
    setGuideId(assignment?.guide_id || "");
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const next =
      modal === "create"
        ? validateSchedule(form)
        : !guideId
          ? { guide: "กรุณาเลือกไกด์" }
          : {};
    setErrors(next);
    setActionError("");
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const result =
        modal === "create"
          ? await createSchedule(form)
          : await assignGuide({ scheduleId: selected.id, guideId });
      if (!result.success) {
        setActionError(result.error.message);
        return;
      }
      setSuccess(
        modal === "create"
          ? "สร้างรอบนำเที่ยวเรียบร้อยแล้ว"
          : "มอบหมายไกด์เรียบร้อยแล้ว",
      );
      setModal(null);
      setReload((x) => x + 1);
    } catch {
      setActionError("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  }
  const fields = [
    ["tour_date", "วันที่ (Tour Date) ", "date"],
    ["start_time", "เวลาเริ่ม ", "time"],
    ["end_time", "เวลาสิ้นสุด ", "time"],
    ["max_participants", "จำนวนผู้เข้าร่วมสูงสุด ", "number"],
  ];
  return (
    <section className="mx-auto max-w-7xl text-textPrimary">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">ตารางนำเที่ยว</h1>
          <p className="mt-1 text-textSecondary">จัดการรอบนำเที่ยวและตารางงาน</p>
        </div>
        <Button onClick={() => open("create")} disabled={loading || !!error}>
          + สร้างรอบนำเที่ยว
        </Button>
      </div>
      <Feedback error={error} success={success} />
      {error && (
        <Button
          onClick={() => {
            setLoading(true);
            setReload((x) => x + 1);
          }}
        >
          ลองอีกครั้ง
        </Button>
      )}
      <div className="space-y-3 sm:hidden">
        {loading ? (
          <div className="rounded-card border border-border bg-surface p-6 text-center text-textSecondary">
            กำลังโหลด…
          </div>
        ) : schedules.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-6 text-center text-textSecondary">
            ยังไม่มีรอบนำเที่ยว เริ่มด้วยปุ่มสร้างรอบนำเที่ยว
          </div>
        ) : (
          schedules.map((s) => {
            const a = Array.isArray(s.guide_assignments)
              ? s.guide_assignments[0]
              : s.guide_assignments;
            return (
              <article key={s.id} className="min-w-0 rounded-card border border-border bg-surface p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{formatDate(s.tour_date)}</p>
                    <p className="text-sm text-textSecondary">
                      {formatTime(s.start_time)} – {formatTime(s.end_time)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-semibold ${scheduleStatusColors[s.status] || "bg-slate-100 text-slate-700 border-slate-300"}`}
                  >
                    {statusLabel(s.status)}
                  </span>
                </div>

                <p className="mt-3 break-words font-medium">
                  {s.routes?.name || "ไม่พบเส้นทาง"}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                  <div>
                    <dt className="text-textSecondary">ความจุ</dt>
                    <dd className="mt-1 font-medium">{s.max_participants} คน</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-textSecondary">ไกด์</dt>
                    <dd className="mt-1 break-words font-medium">
                      {a
                        ? guides.find((g) => g.id === a.guide_id)?.full_name ||
                          "ไกด์ที่ได้รับมอบหมาย"
                        : "ยังไม่มอบหมาย"}
                    </dd>
                    {a && (
                      <dd className="text-textSecondary">{statusLabel(a.status)}</dd>
                    )}
                  </div>
                </dl>

                {["OPEN", "FULL"].includes(s.status) && !isUpcoming(s) && (
                  <p className="mt-3 text-sm text-danger">
                    ผ่านเวลาเริ่มแล้ว · จองไม่ได้
                  </p>
                )}
                <Button
                  className="mt-4 w-full"
                  size="sm"
                  variant="secondary"
                  disabled={!canAssign(s) || !!error}
                  onClick={() => open("assign", s)}
                >
                  {a ? "เปลี่ยนไกด์" : "มอบหมายไกด์"}
                </Button>
              </article>
            );
          })
        )}
      </div>
      <div className="hidden overflow-x-auto rounded-card border border-border bg-surface sm:block">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-background">
            <tr>
              {["วันและเวลา", "เส้นทาง", "ความจุ", "สถานะ", "ไกด์"].map((x) => (
                <th key={x} className="p-4">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="p-8 text-center">
                  กำลังโหลด…
                </td>
              </tr>
            ) : schedules.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center">
                  ยังไม่มีรอบนำเที่ยว เริ่มด้วยปุ่มสร้างรอบนำเที่ยว
                </td>
              </tr>
            ) : (
              schedules.map((s) => {
                const a = Array.isArray(s.guide_assignments)
                  ? s.guide_assignments[0]
                  : s.guide_assignments;
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-4 whitespace-nowrap">
                      {formatDate(s.tour_date)}
                      <p className="text-textSecondary">
                        {formatTime(s.start_time)} – {formatTime(s.end_time)}
                      </p>
                    </td>
                    <td className="p-4">{s.routes?.name || "ไม่พบเส้นทาง"}</td>
                    <td className="p-4">{s.max_participants}{" "}<span role="img" aria-label="คน">👤</span></td>
                    <td className="p-4">
                      <span
                        className={`inline-flex min-w-24 items-center justify-center whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-semibold ${scheduleStatusColors[s.status] || "bg-slate-100 text-slate-700 border-slate-300"}`}
                      >
                        {statusLabel(s.status)}
                      </span>
                      {["OPEN", "FULL"].includes(s.status) &&
                        !isUpcoming(s) && (
                          <p className="text-danger">
                            ผ่านเวลาเริ่มแล้ว · จองไม่ได้
                          </p>
                        )}
                    </td>
                    <td className="p-4">
                      <p>
                        {a
                          ? guides.find((g) => g.id === a.guide_id)
                              ?.full_name || "ไกด์ที่ได้รับมอบหมาย"
                          : "ยังไม่มอบหมาย"}
                      </p>
                      {a && (
                        <p className="text-textSecondary">
                          {statusLabel(a.status)}
                        </p>
                      )}
                      <Button
                        className="mt-2"
                        size="sm"
                        variant="secondary"
                        disabled={!canAssign(s) || !!error}
                        onClick={() => open("assign", s)}
                      >
                        {a ? "เปลี่ยนไกด์" : "มอบหมายไกด์"}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal
          title={modal === "create" ? "สร้างรอบนำเที่ยว" : "มอบหมายไกด์"}
          busy={busy}
          onClose={() => setModal(null)}
        >
          <form onSubmit={submit} noValidate>
            <Feedback error={actionError} />
            <fieldset disabled={busy} className="space-y-4">
              {modal === "create" ? (
                <>
                  <label className="block" htmlFor="m4-route">
                    เส้นทาง (Route)
                    <select
                      id="m4-route"
                      className={fieldStyle}
                      value={form.route_id}
                      onChange={(e) =>
                        setForm({ ...form, route_id: e.target.value })
                      }
                      aria-invalid={!!errors.route_id}
                    >
                      <option value="">เลือกเส้นทาง</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-danger">
                      {errors.route_id}
                    </span>
                  </label>
                  {fields.map(([key, label, type]) => (
                    <label className="block" key={key} htmlFor={`m4-${key}`}>
                      {label}
                      <input
                        id={`m4-${key}`}
                        className={fieldStyle}
                        type={type}
                        min={
                          type === "date"
                            ? thaiToday()
                            : type === "number"
                              ? 1
                              : undefined
                        }
                        step={type === "number" ? 1 : undefined}
                        value={form[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: e.target.value })
                        }
                        aria-invalid={!!errors[key]}
                      />
                      <span
                        role={errors[key] ? "alert" : undefined}
                        className="text-sm text-danger"
                      >
                        {errors[key]}
                      </span>
                    </label>
                  ))}
                </>
              ) : (
                <label className="block" htmlFor="m4-guide">
                  ไกด์ *
                  <select
                    id="m4-guide"
                    className={fieldStyle}
                    value={guideId}
                    onChange={(e) => setGuideId(e.target.value)}
                  >
                    <option value="">เลือกไกด์</option>
                    {guides.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.full_name}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-danger">{errors.guide}</span>
                  {guides.length === 0 && <p>ไม่มีไกด์ที่เปิดใช้งาน</p>}
                </label>
              )}
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setModal(null)}
                >
                  ยกเลิก
                </Button>
                <Button type="submit">
                  {busy ? "กำลังบันทึก…" : "บันทึก"}
                </Button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}
    </section>
  );
}
