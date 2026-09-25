import {
  formatDate,
  formatTime,
  statusLabel,
  canComplete,
  attendanceAvailability,
} from "../../services/m4/rules";
import { Confirm, Feedback } from "../../components/m4/Feedback";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getMyTourManifest,
  updateTourAttendance,
} from "../../services/assignmentService";
import {
  completeTour,
  getScheduleDetail,
} from "../../services/scheduleService";
export default function TourDetail() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  // State สำหรับจัดการ UI
  const [manifest, setManifest] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [clockNow, setClockNow] = useState(() => Date.now());
  const manifestRequestRef = useRef(0);
  const attendance = attendanceAvailability(schedule, clockNow);

  useEffect(() => {
    const updateClock = () => setClockNow(Date.now());
    const timer = window.setInterval(updateClock, 30_000);
    window.addEventListener("focus", updateClock);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateClock);
    };
  }, []);

  const fetchManifest = useCallback(async () => {
    const requestId = ++manifestRequestRef.current;
    setIsLoading(true);
    setErrorMsg("");
    // Do not show a previous tour's participant list when the route changes.
    setManifest([]);
    setSchedule(null);
    try {
      const [res, detail] = await Promise.all([
        getMyTourManifest(scheduleId),
        getScheduleDetail(scheduleId),
      ]);
      if (requestId !== manifestRequestRef.current) return;
      if (!detail.success || !res.success) {
        throw new Error("LOAD_FAILED");
      }
      setSchedule(detail.data);
      setManifest(res.data || []);
    } catch {
      if (requestId === manifestRequestRef.current) {
        setErrorMsg("โหลดรายชื่อไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
    } finally {
      if (requestId === manifestRequestRef.current) setIsLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    const timer = setTimeout(fetchManifest, 0);
    return () => {
      clearTimeout(timer);
      manifestRequestRef.current += 1;
    };
  }, [fetchManifest]);

  const handleAttendance = async (bookingId, status) => {
    if (busy || isCompleting) return;
    // Recheck at click time; the SQL RPC remains authoritative.
    const current = attendanceAvailability(schedule);
    if (
      (status === "CHECKED_IN" && !current.canCheckIn) ||
      (status === "NO_SHOW" && !current.canNoShow)
    ) {
      setSuccess("");
      setErrorMsg(current.message || "ยังไม่อยู่ในช่วงเวลาที่อนุญาตให้เช็กชื่อ");
      return;
    }
    setBusy(true);
    setErrorMsg("");
    setSuccess("");
    try {
      const res = await updateTourAttendance(bookingId, status);

      if (!res.success) {
        const detail = String(res.error?.message || "");
        if (detail.includes("NO_SHOW_TOO_EARLY")) {
          throw new Error("ระบุว่าไม่มาได้หลังเริ่มทัวร์ 15 นาที");
        }
        if (detail.includes("ATTENDANCE_WINDOW_CLOSED")) {
          throw new Error("อยู่นอกช่วงเวลาที่อนุญาตให้เช็กชื่อ กรุณาโหลดข้อมูลใหม่");
        }
        if (detail.includes("INVALID_SCHEDULE_TIME")) {
          throw new Error("ข้อมูลเวลาของรอบนำเที่ยวไม่ถูกต้อง กรุณาติดต่อผู้ดูแล");
        }
        throw new Error("บันทึกการเช็กชื่อไม่สำเร็จ กรุณาโหลดข้อมูลใหม่");
      }

      // อัปเดตหน้าจอโดยไม่ต้องโหลดใหม่ทั้งหมด
      setManifest((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId ? { ...b, attendance_status: status } : b,
        ),
      );
      setSuccess("บันทึกการเช็กชื่อเรียบร้อยแล้ว");
    } catch (error) {
      setErrorMsg(error?.message || "บันทึกการเช็กชื่อไม่สำเร็จ กรุณาโหลดข้อมูลใหม่");
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteTour = async () => {
    if (busy || isCompleting) return;
    if (!canComplete(schedule)) {
      setErrorMsg("สถานะรอบนี้ไม่อนุญาตให้จบการนำเที่ยว");
      return;
    }
    setErrorMsg("");

    setIsCompleting(true);
    try {
      // เรียกใช้ฟังก์ชัน Atomic Complete Tour อัปเดต 3 ส่วนรวดเดียว
      const res = await completeTour(scheduleId);

      if (!res.success) {
        setErrorMsg(res.error?.message || "จบทัวร์ไม่สำเร็จ กรุณาลองอีกครั้ง");
        return;
      }

      setSuccess("จบการนำเที่ยวเรียบร้อยแล้ว");
      setConfirming(false);
      await fetchManifest();
    } catch {
      setErrorMsg("จบทัวร์ไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setIsCompleting(false);
    }
  };

  const getAttendanceBadge = (status) => {
    const badges = {
      NOT_CHECKED_IN: (
        <span className="inline-flex rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
          ยังไม่เช็กอิน
        </span>
      ),
      CHECKED_IN: (
        <span className="inline-flex rounded-md border border-green-300 bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-900">
          เช็กอินแล้ว
        </span>
      ),
      NO_SHOW: (
        <span className="inline-flex rounded-md border border-red-300 bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-900">
          ไม่มาปรากฏตัว
        </span>
      ),
    };
    return badges[status] || null;
  };

  // Reuse the exact attendance actions on desktop and mobile.
  const renderAttendanceActions = (participant) => {
    const disabled =
      busy ||
      isCompleting ||
      participant.booking_status !== "CONFIRMED" ||
      !["OPEN", "FULL", "CLOSED"].includes(schedule?.status);

    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || !attendance.canCheckIn}
          title={!attendance.canCheckIn ? attendance.message : undefined}
          onClick={() => handleAttendance(participant.booking_id, "CHECKED_IN")}
          className="inline-flex min-h-11 min-w-24 items-center justify-center rounded-button border border-green-800 bg-green-700 px-5 py-2.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-green-300 disabled:bg-green-100 disabled:text-green-800 disabled:shadow-none disabled:opacity-100 disabled:hover:bg-green-100"
        >
          มา
        </button>
        <button
          type="button"
          disabled={disabled || !attendance.canNoShow}
          title={!attendance.canNoShow ? attendance.message : undefined}
          onClick={() => handleAttendance(participant.booking_id, "NO_SHOW")}
          className="inline-flex min-h-11 min-w-24 items-center justify-center rounded-button border border-red-800 bg-red-700 px-5 py-2.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-red-300 disabled:bg-red-100 disabled:text-red-800 disabled:shadow-none disabled:opacity-100 disabled:hover:bg-red-100"
        >
          ไม่มา
        </button>
      </div>
    );
  };

  return (
    <div className="w-full min-w-0">
      <div className="w-full">
        <button
          onClick={() => navigate("/guide")}
          className="text-textSecondary hover:text-primary text-sm mb-6 flex items-center gap-1 font-medium transition-colors"
        >
          ← กลับไปหน้า Dashboard
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">
              รายละเอียดการนำเที่ยว (Tour Detail)
            </h1>
            <p className="text-textSecondary text-sm mt-1">
              จัดการรายชื่อผู้เข้าร่วม เช็กอิน และดำเนินการนำเที่ยว
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* ปุ่มแจ้งเหตุ (เชื่อมกับโมดูล M5) */}
            {['OPEN', 'FULL', 'CLOSED'].includes(schedule?.status) && (
              <button
                type="button"
                onClick={() =>
                  navigate(`/incidents/new?scheduleId=${encodeURIComponent(scheduleId)}`)
                }
                className="bg-warning hover:bg-warning/90 text-white px-4 py-2.5 rounded-button font-medium shadow-sm transition-colors flex items-center gap-2"
              >
                ⚠️ แจ้งเหตุฉุกเฉิน
              </button>
            )}

            {/* ปุ่มจบงาน (ของโมดูล M4) */}
            <button
              onClick={() => {
                setErrorMsg("");
                setConfirming(true);
              }}
              disabled={
                isCompleting || isLoading || busy || !canComplete(schedule)
              }
              className="bg-primary hover:bg-primary/90 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-button font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              {isCompleting ? "กำลังประมวลผล..." : "จบการนำเที่ยว"}
            </button>
          </div>
        </div>

        <Feedback success={success} />
        {schedule && (
          <p className="mb-4 text-textSecondary">
            {schedule.routes?.name} · {formatDate(schedule.tour_date)}{" "}
            {formatTime(schedule.start_time)} – {formatTime(schedule.end_time)}{" "}
            · {statusLabel(schedule.status)}
          </p>
        )}
        {confirming && (
          <Confirm
            title="ยืนยันจบการนำเที่ยว"
            busy={isCompleting}
            error={errorMsg}
            onClose={() => setConfirming(false)}
            onConfirm={handleCompleteTour}
          >
            การจบทัวร์จะเปลี่ยนสถานะรอบและการจองที่ยืนยันแล้ว
            การกระทำนี้ย้อนกลับไม่ได้
          </Confirm>
        )}
        <button
          type="button"
          disabled={busy || isCompleting || isLoading}
          onClick={fetchManifest}
          className="mb-5 rounded-button border border-border bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          โหลดรายชื่อใหม่
        </button>
        {/* Error State */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger rounded-button text-danger text-sm">
            {errorMsg}
          </div>
        )}

        {schedule && attendance.message && (
          <p role="status" className="mb-4 rounded-button border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {attendance.message}
          </p>
        )}

        {/* Mobile manifest: show complete participant details without a hidden action column. */}
        <div className="rounded-card border border-border bg-surface shadow-sm sm:hidden">
          {isLoading ? (
            <p className="p-6 text-center text-sm text-textSecondary">
              กำลังโหลดข้อมูลผู้เข้าร่วม...
            </p>
          ) : manifest.length === 0 ? (
            <p className="p-6 text-center text-sm text-textSecondary">
              ยังไม่มีผู้เข้าร่วมที่ยืนยันการจองในรอบนี้
            </p>
          ) : (
            <div className="divide-y divide-border">
              {manifest.map((participant) => (
                <article key={participant.booking_id} className="space-y-4 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="break-words font-semibold text-textPrimary">
                        {participant.full_name}
                      </h2>
                      <p className="break-all text-sm text-textSecondary">
                        {participant.phone || "ไม่มีเบอร์โทร"}
                      </p>
                    </div>
                    {getAttendanceBadge(participant.attendance_status)}
                  </div>
                  <dl className="grid gap-3 text-sm">
                    <div>
                      <dt className="text-textSecondary">จำนวนผู้เข้าร่วม</dt>
                      <dd className="font-medium text-textPrimary">
                        {participant.participant_count} ท่าน
                      </dd>
                    </div>
                    <div>
                      <dt className="text-textSecondary">คำขอพิเศษ</dt>
                      <dd className="break-words text-textPrimary">
                        {participant.special_request || "-"}
                      </dd>
                    </div>
                  </dl>
                  <div className="border-t border-border pt-3">
                    <p className="mb-2 text-sm font-medium text-textSecondary">
                      จัดการการเช็กชื่อ
                    </p>
                    {renderAttendanceActions(participant)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Desktop/tablet manifest: keep all columns readable and scroll when needed. */}
        <div className="hidden overflow-hidden rounded-card border border-border bg-surface shadow-sm sm:block">
          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full text-left border-collapse">
              <thead>
                <tr className="bg-background border-b border-border text-textSecondary text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">ผู้จอง</th>
                  <th className="px-6 py-4 font-medium">จำนวน</th>
                  <th className="px-6 py-4 font-medium">คำขอพิเศษ</th>
                  <th className="px-6 py-4 font-medium">สถานะการเช็กอิน</th>
                  <th className="px-6 py-4 font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {/* Loading State */}
                {isLoading ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-12 text-center text-textSecondary"
                    >
                      กำลังโหลดข้อมูลผู้เข้าร่วม...
                    </td>
                  </tr>
                ) : manifest.length === 0 ? (
                  /* Empty State */
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-12 text-center text-textSecondary"
                    >
                      ยังไม่มีผู้เข้าร่วมที่ยืนยันการจองในรอบนี้
                    </td>
                  </tr>
                ) : (
                  /* Data State */
                  manifest.map((participant) => (
                    <tr
                      key={participant.booking_id}
                      className="hover:bg-background transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-textPrimary font-medium">
                          {participant.full_name}
                        </div>
                        <div className="text-textSecondary text-sm">
                          {participant.phone || "ไม่มีเบอร์โทร"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-textPrimary">
                        {participant.participant_count} ท่าน
                      </td>
                      <td
                        className="px-6 py-4 text-textSecondary text-sm max-w-[200px] truncate"
                        title={participant.special_request}
                      >
                        {participant.special_request || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {getAttendanceBadge(participant.attendance_status)}
                      </td>
                      <td className="px-6 py-4">
                        {renderAttendanceActions(participant)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
