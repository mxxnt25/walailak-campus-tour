import { Feedback } from "../../components/m4/Feedback";
import { canAssign, formatDate, formatTime } from "../../services/m4/rules";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  listMyGuideAssignments,
  updateMyAssignmentStatus,
} from "../../services/assignmentService";
import { getBookedParticipantCount } from "../../services/bookingService";

export default function GuideDashboard() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await listMyGuideAssignments();

      if (res.success) {
        const assignmentsWithCount = await Promise.all(
          res.data.map(async (task) => {
            const countRes = await getBookedParticipantCount(task.schedule_id);
            const bookedCount = countRes.success ? countRes.data : null;
            return { ...task, bookedCount };
          }),
        );

        setAssignments(assignmentsWithCount);
      } else {
        setAssignments([]);
        setErrorMsg(res.error?.message || 'โหลดตารางงานไม่สำเร็จ กรุณาลองอีกครั้ง');
      }
    } catch {
      setAssignments([]);
      setErrorMsg("โหลดตารางงานไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchAssignments, 0);
    return () => clearTimeout(timer);
  }, [fetchAssignments]);

  // อัปเดตให้บันทึกลง Database จริง (Persisted Accept/Decline)
  const handleUpdateAssignmentStatus = async (assignmentId, newStatus) => {
    if (busy) return;
    setBusy(true);
    setErrorMsg("");
    setSuccess("");
    try {
      const res = await updateMyAssignmentStatus(assignmentId, newStatus);

      if (!res.success) {
        throw new Error(
          res.error?.message || "Unable to update assignment status",
        );
      }

      setAssignments((prev) =>
        prev.map((task) =>
          task.id === assignmentId ? { ...task, status: newStatus } : task,
        ),
      );
      setSuccess(
        newStatus === "ACCEPTED"
          ? "รับงานเรียบร้อยแล้ว"
          : "ปฏิเสธงานเรียบร้อยแล้ว",
      );
    } catch {
      setErrorMsg(
        "อัปเดตงานไม่สำเร็จ รอบอาจหมดเวลาหรือไกด์มีงานทับซ้อน กรุณาโหลดใหม่",
      );
    } finally {
      setBusy(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      ASSIGNED: (
        <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-semibold bg-amber-100 text-amber-900 border-amber-200">
          รอการตอบรับ
        </span>
      ),
      ACCEPTED: (
        <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-semibold bg-green-100 text-green-800 border-green-200">
          ยืนยันรับงานแล้ว
        </span>
      ),
      DECLINED: (
        <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-semibold bg-red-100 text-red-800 border-red-200">
          ปฏิเสธงาน
        </span>
      ),
      COMPLETED: (
        <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-semibold bg-blue-100 text-blue-800 border-blue-200">
          เสร็จสิ้น
        </span>
      ),
    };
    return badges[status] || null;
  };

  return (
    <div className="w-full min-w-0">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-textPrimary">ตารางงานนำเที่ยวของฉัน</h1>
          <p className="text-textSecondary text-sm mt-1">
            ตรวจสอบและจัดการตารางนำเที่ยวของคุณแบบสรุป
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger rounded-button text-danger text-sm">
            {errorMsg}
          </div>
        )}

        <Feedback success={success} />
        <button
          type="button"
          disabled={busy || isLoading}
          onClick={fetchAssignments}
          className="mb-5 rounded-button border border-border bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          โหลดข้อมูลใหม่
        </button>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-textPrimary mb-4">
            ตารางงานของคุณ
          </h2>

          {isLoading ? (
            <div className="text-center py-10 text-textSecondary">
              กำลังโหลดข้อมูล...
            </div>
          ) : assignments.length === 0 ? (
            <div className="bg-surface p-8 rounded-card border border-border text-center text-textSecondary shadow-sm">
              คุณยังไม่มีตารางนำเที่ยวที่ได้รับมอบหมาย
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {assignments.map((assignment) => {
                if (!assignment.tour_schedules) return null;
                const isFull =
                  assignment.bookedCount !== null &&
                  assignment.bookedCount >=
                    assignment.tour_schedules.max_participants;

                return (
                  <div
                    key={assignment.id}
                  className="bg-surface p-5 sm:p-6 rounded-card border border-border shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
                  >
                    <div className="flex justify-between items-start mb-4">
                      {getStatusBadge(assignment.status)}
                      <span className="text-primary font-medium text-sm">
                        {formatDate(assignment.tour_schedules.tour_date)}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-textPrimary mb-2">
                      {assignment.tour_schedules.routes?.name}
                    </h3>

                    <div className="space-y-2 text-textSecondary text-sm mb-6 flex-grow">
                      <p>
                        เวลา: {formatTime(assignment.tour_schedules.start_time)}{" "}
                        - {formatTime(assignment.tour_schedules.end_time)}
                      </p>
                      <p
                        className={`font-medium ${isFull ? "text-danger" : "text-textPrimary"}`}
                      >
                        ผู้เข้าร่วม: {assignment.bookedCount ?? "โหลดไม่สำเร็จ"}{" "}
                        / {assignment.tour_schedules.max_participants}{" "}
                        <span role="img" aria-label="คน">👤</span>
                        {isFull && (
                          <span className="inline-flex rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 ml-2">
                            เต็มแล้ว
                          </span>
                        )}
                      </p>
                    </div>

                    {/* ปุ่มสำหรับสถานะ รอการตอบรับ */}
                    {assignment.status === "ASSIGNED" &&
                      !canAssign(assignment.tour_schedules) && (
                        <p className="text-danger">
                          รอบนี้ไม่พร้อมรับงานหรือผ่านเวลาเริ่มแล้ว
                        </p>
                      )}
                    {assignment.status === "ASSIGNED" && (
                      <div className="flex gap-3 mt-auto pt-4 border-t border-border">
                        <button
                          disabled={
                            busy || !canAssign(assignment.tour_schedules)
                          }
                          onClick={() =>
                            handleUpdateAssignmentStatus(
                              assignment.id,
                              "ACCEPTED",
                            )
                          }
                          className="flex-1 rounded-button bg-primary px-3 py-2 text-white font-medium transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          รับงานนี้
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            handleUpdateAssignmentStatus(
                              assignment.id,
                              "DECLINED",
                            )
                          }
                          className="flex-1 rounded-button bg-background border border-border hover:bg-primary/10 text-textPrimary px-3 py-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ปฏิเสธ
                        </button>
                      </div>
                    )}

                    {/* งานที่เสร็จสิ้นแล้วดูข้อมูลได้ แต่ไม่ชวนให้เช็กชื่อซ้ำ */}
                    {["ACCEPTED", "COMPLETED"].includes(assignment.status) && (
                      <div className="mt-auto pt-4 border-t border-border">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/guide/tours/${assignment.schedule_id}`)
                          }
                          className={`w-full rounded-button border px-3 py-2 font-medium transition-colors ${assignment.status === 'COMPLETED' || assignment.tour_schedules.status === 'COMPLETED' ? 'border-border bg-surface text-textPrimary hover:bg-background' : 'border-primary bg-primary text-white hover:bg-primary/90'}`}
                        >
                          {assignment.status === 'COMPLETED' || assignment.tour_schedules.status === 'COMPLETED'
                            ? 'ดูรายละเอียดทัวร์ที่เสร็จสิ้น'
                            : 'จัดการลูกทัวร์ / เช็กชื่อ'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
