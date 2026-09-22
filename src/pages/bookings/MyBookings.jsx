import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import StatusBadge from "../../components/common/StatusBadge";
import Toast from "../../components/common/Toast";

import { cancelMyBooking, listMyBookings } from "../../services/bookingService";

import { formatDate, formatTime } from "../../utils/dateTime";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [authRequired, setAuthRequired] = useState(false);

  const [confirmBookingId, setConfirmBookingId] = useState(null);

  const [cancellingId, setCancellingId] = useState(null);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBookings() {
      const result = await listMyBookings();

      if (cancelled) {
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

  if (loading) {
    return <LoadingState message="กำลังโหลดรายการจอง..." />;
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
            <Link to="/login">
              <Button>เข้าสู่ระบบ</Button>
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

      {errorMessage && <ErrorState message={errorMessage} />}

      {bookings.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการจอง"
          description="เลือกเส้นทางและรอบนำเที่ยวที่ต้องการเพื่อเริ่มการจอง"
          action={
            <Link to="/routes">
              <Button>ดูเส้นทางนำเที่ยว</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const schedule = booking.tour_schedules;
            const route = schedule?.routes;

            return (
              <Card key={booking.id}>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-textPrimary">
                          {route?.name || "รอบนำเที่ยว"}
                        </h2>

                        <StatusBadge status={booking.status} />
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
                    <Link to={`/bookings/${booking.id}`}>
                      <Button variant="secondary">ดูรายละเอียด</Button>
                    </Link>

                    {booking.status === "CONFIRMED" && (
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
