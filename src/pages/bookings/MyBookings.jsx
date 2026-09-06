import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";

import {
  cancelMyBooking,
  listMyBookings,
} from "../../services/bookingService";

function getStatusColor(status) {
  switch (status) {
    case "CONFIRMED":
      return "success";
    case "CANCELLED":
      return "danger";
    case "COMPLETED":
      return "primary";
    default:
      return "primary";
  }
}

function getStatusLabel(status) {
  switch (status) {
    case "CONFIRMED":
      return "ยืนยันแล้ว";
    case "CANCELLED":
      return "ยกเลิกแล้ว";
    case "COMPLETED":
      return "เสร็จสิ้น";
    default:
      return status || "-";
  }
}

function formatTourDate(value) {
  if (!value) return "-";

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatTime(value) {
  if (!value) return "-";
  return value.slice(0, 5);
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBookings() {
      const result = await listMyBookings();

      if (cancelled) {
        return;
      }

      if (!result.success) {
        setBookings([]);
        setErrorMessage(result.error.message);
        setLoading(false);
        return;
      }

      setBookings(result.data);
      setLoading(false);
    }

    fetchBookings();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCancel(bookingId) {
    const confirmed = window.confirm(
      "ยืนยันการยกเลิกการจองนี้หรือไม่?",
    );

    if (!confirmed) {
      return;
    }

    setCancellingId(bookingId);
    setErrorMessage("");

    const result = await cancelMyBooking(bookingId);

    if (!result.success) {
      setErrorMessage(result.error.message);
      setCancellingId(null);
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

    setCancellingId(null);
  }

  if (loading) {
    return <LoadingState message="กำลังโหลดรายการจอง..." />;
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">
          การจองของฉัน
        </h1>

        <p className="mt-1 text-sm text-textSecondary">
          ตรวจสอบรายละเอียดและสถานะการจองรอบนำเที่ยวของคุณ
        </p>
      </div>

      {errorMessage && <ErrorState message={errorMessage} />}

      {bookings.length === 0 ? (
        <Card className="py-12 text-center">
          <h2 className="font-semibold text-textPrimary">
            ยังไม่มีรายการจอง
          </h2>

          <p className="mt-2 text-sm text-textSecondary">
            เลือกเส้นทางและรอบนำเที่ยวที่ต้องการเพื่อเริ่มการจอง
          </p>

          <div className="mt-5">
            <Link to="/routes">
              <Button>ดูเส้นทางนำเที่ยว</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const schedule = booking.tour_schedules;
            const route = schedule?.routes;

            return (
              <Card key={booking.id}>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-textPrimary">
                          {route?.name || "รอบนำเที่ยว"}
                        </h2>

                        <Badge color={getStatusColor(booking.status)}>
                          {getStatusLabel(booking.status)}
                        </Badge>
                      </div>

                      <p className="mt-1 text-xs text-textSecondary">
                        Booking #{booking.id.slice(0, 8)}
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm text-textSecondary sm:grid-cols-2">
                      <p>
                        วันที่:{" "}
                        <span className="font-medium text-textPrimary">
                          {formatTourDate(schedule?.tour_date)}
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
                      <Button variant="secondary">
                        ดูรายละเอียด
                      </Button>
                    </Link>

                    {booking.status === "CONFIRMED" && (
                      <Button
                        variant="danger"
                        disabled={cancellingId === booking.id}
                        onClick={() => handleCancel(booking.id)}
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
    </section>
  );
}
