import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ConfirmModal from "../../components/common/ConfirmModal";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import StatusBadge from "../../components/common/StatusBadge";
import Toast from "../../components/common/Toast";

import {
  cancelMyBooking,
  getBookingDetail,
  getBookingDisplayStatus,
} from "../../services/bookingService";

import { formatDate, formatDateTime, formatTime } from "../../utils/dateTime";

export default function BookingDetail() {
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [authRequired, setAuthRequired] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const [cancelling, setCancelling] = useState(false);

  const [toast, setToast] = useState(null);
  const [clockNow, setClockNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;

    async function fetchBooking() {
      const result = await getBookingDetail(id);

      if (cancelled) {
        return;
      }

      if (!result.success) {
        setBooking(null);

        if (result.error.code === "AUTH_REQUIRED") {
          setAuthRequired(true);
          setErrorMessage("");
        } else {
          setErrorMessage(
            result.error?.message || "ไม่สามารถโหลดรายละเอียดการจองได้",
          );
        }

        setLoading(false);
        return;
      }

      setBooking(result.data);
      setAuthRequired(false);
      setErrorMessage("");
      setLoading(false);
    }

    fetchBooking();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setClockNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  function openCancelConfirmation() {
    if (cancelling) {
      return;
    }

    setCancelModalOpen(true);
  }

  function closeCancelConfirmation() {
    if (cancelling) {
      return;
    }

    setCancelModalOpen(false);
  }

  async function handleConfirmCancel() {
    if (cancelling) {
      return;
    }

    if (
      !booking ||
      booking.status !== "CONFIRMED" ||
      getBookingDisplayStatus(booking, new Date()) === "COMPLETED"
    ) {
      setCancelModalOpen(false);
      setToast({
        tone: "danger",
        message: "รายการจองนี้ไม่สามารถยกเลิกได้แล้ว",
      });
      return;
    }

    setCancelling(true);
    setErrorMessage("");

    const result = await cancelMyBooking(id);

    if (!result.success) {
      setToast({
        tone: "danger",
        message: result.error?.message || "ไม่สามารถยกเลิกการจองได้",
      });

      setCancelling(false);
      setCancelModalOpen(false);
      return;
    }

    setBooking((currentBooking) => {
      if (!currentBooking) {
        return currentBooking;
      }

      return {
        ...currentBooking,
        ...result.data,
        tour_schedules: currentBooking.tour_schedules,
      };
    });

    setToast({
      tone: "success",
      message: "ยกเลิกการจองเรียบร้อยแล้ว",
    });

    setCancelling(false);
    setCancelModalOpen(false);
  }

  if (loading) {
    return <LoadingState message="กำลังโหลดรายละเอียดการจอง..." />;
  }

  if (authRequired) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Card className="py-12 text-center">
          <h1 className="text-xl font-semibold text-textPrimary">
            กรุณาเข้าสู่ระบบ
          </h1>

          <p className="mt-2 text-sm text-textSecondary">
            เข้าสู่ระบบเพื่อดูรายละเอียดการจองของคุณ
          </p>

          <div className="mt-5">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-button bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        </Card>
      </section>
    );
  }

  if (!booking) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <ErrorState message={errorMessage || "ไม่พบรายการจอง"} />
      </section>
    );
  }

  const schedule = booking.tour_schedules;
  const route = schedule?.routes;
  const displayStatus = getBookingDisplayStatus(booking, clockNow);

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link
          to="/my-bookings"
          className="text-sm text-primary hover:underline"
        >
          ← กลับไปการจองของฉัน
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-textPrimary">
            รายละเอียดการจอง
          </h1>

          {displayStatus === "COMPLETED" ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              เสร็จสิ้นแล้ว
            </span>
          ) : (
            <StatusBadge status={displayStatus} />
          )}
        </div>
      </div>

      {errorMessage && <ErrorState message={errorMessage} />}

      {displayStatus === "COMPLETED" && booking.status === "CONFIRMED" && (
        <p className="text-sm text-textSecondary">
          สถานะนี้แสดงตามเวลาที่ผ่านไป การรีวิวจะเปิดได้เมื่อระบบยืนยัน
          สถานะการจองเป็นเสร็จสิ้นจริง
        </p>
      )}

      <Card>
        <div className="space-y-5">
          <div>
            <p className="text-sm text-textSecondary">เส้นทาง</p>

            <p className="mt-1 text-xl font-semibold text-textPrimary">
              {route?.name || "ไม่ระบุชื่อเส้นทาง"}
            </p>

            {route?.id && (
              <Link
                to={`/routes/${route.id}`}
                className="mt-1 inline-block text-sm text-primary hover:underline"
              >
                ดูรายละเอียดเส้นทาง
              </Link>
            )}
          </div>

          <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-textSecondary">วันที่</p>

              <p className="mt-1 font-medium text-textPrimary">
                {formatDate(schedule?.tour_date)}
              </p>
            </div>

            <div>
              <p className="text-sm text-textSecondary">เวลา</p>

              <p className="mt-1 font-medium text-textPrimary">
                {formatTime(schedule?.start_time)}

                {schedule?.end_time
                  ? ` - ${formatTime(schedule.end_time)}`
                  : ""}
              </p>
            </div>

            <div>
              <p className="text-sm text-textSecondary">จำนวนผู้เข้าร่วม</p>

              <p className="mt-1 font-medium text-textPrimary">
                {booking.participant_count} คน
              </p>
            </div>

            <div>
              <p className="text-sm text-textSecondary">จำนวนสูงสุดของรอบ</p>

              <p className="mt-1 font-medium text-textPrimary">
                {schedule?.max_participants ?? "-"} คน
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-textSecondary">คำขอพิเศษ</p>

            <p className="mt-1 whitespace-pre-wrap text-textPrimary">
              {booking.special_request || "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-textSecondary">รหัสการจอง</p>

            <p className="mt-1 break-all font-medium text-textPrimary">
              {booking.id}
            </p>
          </div>

          <div>
            <p className="text-sm text-textSecondary">สร้างเมื่อ</p>

            <p className="mt-1 text-textPrimary">
              {formatDateTime(booking.created_at)}
            </p>
          </div>

          {booking.status === "CONFIRMED" && displayStatus !== "COMPLETED" && (
            <div className="border-t border-border pt-5">
              <Button
                variant="danger"
                disabled={cancelling}
                onClick={openCancelConfirmation}
              >
                {cancelling ? "กำลังยกเลิก..." : "ยกเลิกการจอง"}
              </Button>
            </div>
          )}

          {booking.status === "COMPLETED" && (
            <div className="border-t border-border pt-5">
              <Link
                to={`/reviews/new/${booking.id}`}
                className="inline-flex items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                เขียนรีวิว
              </Link>
            </div>
          )}
        </div>
      </Card>

      <ConfirmModal
        open={cancelModalOpen}
        title="ยืนยันการยกเลิกการจอง"
        description={`คุณต้องการยกเลิกการจอง ${route?.name || "รอบนำเที่ยวนี้"} หรือไม่? เมื่อยกเลิกแล้ว ระบบจะคืนจำนวนที่ว่างให้รอบนำเที่ยว`}
        confirmLabel="ยืนยันการยกเลิก"
        cancelLabel="ไม่ยกเลิก"
        cancelVariant="primary"
        confirmVariant="danger"
        busy={cancelling}
        onConfirm={handleConfirmCancel}
        onCancel={closeCancelConfirmation}
      />

      <Toast
        message={toast?.message || ""}
        tone={toast?.tone || "success"}
        onClose={() => setToast(null)}
      />
    </section>
  );
}
