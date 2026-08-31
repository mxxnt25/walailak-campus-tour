import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import {
  cancelMyBooking,
  getBookingDetail,
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

export default function BookingDetail() {
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchBooking() {
      const result = await getBookingDetail(id);

      if (cancelled) {
        return;
      }

      if (!result.success) {
        setBooking(null);
        setErrorMessage(result.error.message);
        setLoading(false);
        return;
      }

      setBooking(result.data);
      setLoading(false);
    }

    fetchBooking();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleCancel() {
    const confirmed = window.confirm("ยืนยันการยกเลิกการจองนี้หรือไม่?");

    if (!confirmed) {
      return;
    }

    setCancelling(true);
    setErrorMessage("");

    const result = await cancelMyBooking(id);

    if (!result.success) {
      setErrorMessage(result.error.message);
      setCancelling(false);
      return;
    }

    setBooking(result.data);
    setCancelling(false);
  }

  if (loading) {
    return <LoadingState message="กำลังโหลดรายละเอียดการจอง..." />;
  }

  if (!booking) {
    return <ErrorState message={errorMessage || "ไม่พบรายการจอง"} />;
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
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

          <Badge color={getStatusColor(booking.status)}>{booking.status}</Badge>
        </div>
      </div>

      {errorMessage && <ErrorState message={errorMessage} />}

      <Card className="space-y-5">
        <div>
          <p className="text-sm text-textSecondary">รหัสการจอง</p>
          <p className="mt-1 font-medium text-textPrimary">{booking.id}</p>
        </div>

        <div>
          <p className="text-sm text-textSecondary">จำนวนผู้เข้าร่วม</p>
          <p className="mt-1 font-medium text-textPrimary">
            {booking.participant_count} คน
          </p>
        </div>

        <div>
          <p className="text-sm text-textSecondary">คำขอพิเศษ</p>
          <p className="mt-1 text-textPrimary">
            {booking.special_request || "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-textSecondary">สร้างเมื่อ</p>
          <p className="mt-1 text-textPrimary">
            {new Date(booking.created_at).toLocaleString("th-TH")}
          </p>
        </div>

        {booking.status === "CONFIRMED" && (
          <div className="border-t border-border pt-5">
            <Button
              variant="danger"
              disabled={cancelling}
              onClick={handleCancel}
            >
              {cancelling ? "กำลังยกเลิก..." : "ยกเลิกการจอง"}
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
