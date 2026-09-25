import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import Toast from "../../components/common/Toast";
import {
  cancelMyBooking,
  getBookingDisplayStatus,
  getCachedMyBookings,
  listMyBookings,
} from "../../services/bookingService";
import { useAuth } from "../../hooks/useAuth";

import { formatDate, formatTime } from "../../utils/dateTime";

export default function MyBookings() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [bookings, setBookings] = useState(
    () => getCachedMyBookings(userId) ?? [],
  );
  const [loading, setLoading] = useState(
    () => getCachedMyBookings(userId) === null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [authRequired, setAuthRequired] = useState(false);

  const [confirmBookingId, setConfirmBookingId] = useState(null);

  const [cancellingId, setCancellingId] = useState(null);

  const [toast, setToast] = useState(null);
  const [clockNow, setClockNow] = useState(() => new Date());
  const requestVersionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const requestVersion = ++requestVersionRef.current;

    async function fetchBookings() {
      const result = await listMyBookings();

      // A cancellation can complete while a background revalidation is still
      // in flight. Never overwrite the newer local status with that old read.
      if (cancelled || requestVersion !== requestVersionRef.current) {
        return;
      }

      if (!result.success) {
        setBookings([]);

        if (result.error.code === "AUTH_REQUIRED") {
          setAuthRequired(true);
          setErrorMessage("");
        } else {
          setErrorMessage(result.error?.message || "ไม่สามารถโหลดรายการจองได้");
        }

        setLoading(false);
        return;
      }

      setBookings(result.data ?? []);
      setAuthRequired(false);
      setErrorMessage("");
      setLoading(false);
    }

    fetchBookings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setClockNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  function openCancelConfirmation(bookingId) {
    if (cancellingId) {
      return;
    }

    setConfirmBookingId(bookingId);
  }

  function closeCancelConfirmation() {
    if (cancellingId) {
      return;
    }

    setConfirmBookingId(null);
  }

  async function handleConfirmCancel() {
    if (!confirmBookingId || cancellingId) {
      return;
    }

    const bookingId = confirmBookingId;
    const currentBooking = bookings.find((item) => item.id === bookingId);
    if (
      !currentBooking ||
      currentBooking.status !== "CONFIRMED" ||
      getBookingDisplayStatus(currentBooking, new Date()) === "COMPLETED"
    ) {
      setConfirmBookingId(null);
      setToast({
        tone: "danger",
        message: "รายการจองนี้ไม่สามารถยกเลิกได้แล้ว",
      });
      return;
    }

    ++requestVersionRef.current;

    setCancellingId(bookingId);
    setErrorMessage("");

    const result = await cancelMyBooking(bookingId);

    if (!result.success) {
      setToast({
        tone: "danger",
        message: result.error?.message || "ไม่สามารถยกเลิกการจองได้",
      });

      setCancellingId(null);
      setConfirmBookingId(null);
      return;
    }

    setBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              ...result.data,
              tour_schedules: booking.tour_schedules,
            }
          : booking,
      ),
    );

    setToast({
      tone: "success",
      message: "ยกเลิกการจองเรียบร้อยแล้ว",
    });

    setCancellingId(null);
    setConfirmBookingId(null);
  }

  if (authRequired) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Card className="py-12 text-center">
          <h1 className="text-xl font-semibold text-textPrimary">
            กรุณาเข้าสู่ระบบ
          </h1>

          <p className="mt-2 text-sm text-textSecondary">
            เข้าสู่ระบบเพื่อดูรายการจองของคุณ
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

  const bookingToCancel = bookings.find(
    (booking) => booking.id === confirmBookingId,
  );
  const cancelRouteName =
    bookingToCancel?.tour_schedules?.routes?.name || "รอบนำเที่ยวนี้";

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">การจองของฉัน</h1>

        <p className="mt-1 text-sm text-textSecondary">
          ตรวจสอบรายละเอียดและสถานะการจองรอบนำเที่ยวของคุณ
        </p>
      </div>

      {loading ? (
        <div
          className="min-h-[480px] space-y-4"
          aria-busy="true"
          aria-label="กำลังโหลดรายการจอง"
        >
          <p role="status" className="text-sm text-textSecondary">
            กำลังโหลดรายการจอง...
          </p>
          {[0, 1, 2].map((placeholder) => (
            <div
              key={placeholder}
              aria-hidden="true"
              className="motion-safe:animate-pulse rounded-card border border-border bg-surface p-6 shadow-sm"
            >
              <div className="h-5 w-48 rounded-lg bg-background" />
              <div className="mt-4 h-4 w-36 rounded-lg bg-background" />
              <div className="mt-4 h-4 w-3/4 rounded-lg bg-background" />
              <div className="mt-4 h-4 w-1/2 rounded-lg bg-background" />
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <ErrorState message={errorMessage} />
      ) : bookings.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการจอง"
          description="เลือกเส้นทางและรอบนำเที่ยวที่ต้องการเพื่อเริ่มการจอง"
          action={
            <Link
              to="/routes"
              className="inline-flex items-center justify-center rounded-button bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              ดูเส้นทางนำเที่ยว
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const schedule = booking.tour_schedules;
            const route = schedule?.routes;
            const displayStatus = getBookingDisplayStatus(booking, clockNow);

            return (
              <Card key={booking.id}>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-textPrimary">
                          {route?.name || "รอบนำเที่ยว"}
                        </h2>

                        {displayStatus === "COMPLETED" ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            เสร็จสิ้นแล้ว
                          </span>
                        ) : (
                          <StatusBadge status={displayStatus} />
                        )}
                      </div>

                      <p className="mt-1 text-xs text-textSecondary">
                        Booking #{booking.id.slice(0, 8)}
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm text-textSecondary sm:grid-cols-2">
                      <p>
                        วันที่:{" "}
                        <span className="font-medium text-textPrimary">
                          {formatDate(schedule?.tour_date)}
                        </span>
                      </p>

                      <p>
                        เวลา:{" "}
                        <span className="font-medium text-textPrimary">
                          {formatTime(schedule?.start_time)}

                          {schedule?.end_time
                            ? ` - ${formatTime(schedule.end_time)}`
                            : ""}
                        </span>
                      </p>

                      <p>
                        จำนวนผู้เข้าร่วม:{" "}
                        <span className="font-medium text-textPrimary">
                          {booking.participant_count} คน
                        </span>
                      </p>
                    </div>

                    {booking.special_request && (
                      <p className="text-sm text-textSecondary">
                        คำขอพิเศษ:{" "}
                        <span className="text-textPrimary">
                          {booking.special_request}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/bookings/${booking.id}`}
                      className="inline-flex items-center justify-center rounded-button border border-border bg-surface px-4 py-2 text-sm font-medium text-textPrimary transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      ดูรายละเอียด
                    </Link>

                    {booking.status === "CONFIRMED" &&
                      displayStatus !== "COMPLETED" && (
                        <Button
                          variant="danger"
                          disabled={cancellingId === booking.id}
                          onClick={() => openCancelConfirmation(booking.id)}
                        >
                          {cancellingId === booking.id
                            ? "กำลังยกเลิก..."
                            : "ยกเลิกการจอง"}
                        </Button>
                      )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmBookingId)}
        title="ยืนยันการยกเลิกการจอง"
        description={`คุณต้องการยกเลิกการจอง ${cancelRouteName} หรือไม่? เมื่อยกเลิกแล้ว ระบบจะคืนจำนวนที่ว่างให้รอบนำเที่ยว`}
        confirmLabel="ยืนยันการยกเลิก"
        cancelLabel="ไม่ยกเลิก"
        cancelVariant="primary"
        confirmVariant="danger"
        busy={Boolean(confirmBookingId) && cancellingId === confirmBookingId}
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
