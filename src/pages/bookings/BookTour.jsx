import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ErrorState from "../../components/common/ErrorState";

import { createBooking } from "../../services/bookingService";
import { getScheduleDetail } from "../../services/scheduleService";

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

function getStatusLabel(status) {
  switch (status) {
    case "OPEN":
      return "เปิดรับจอง";
    case "FULL":
      return "เต็มแล้ว";
    case "CANCELLED":
      return "ยกเลิก";
    case "COMPLETED":
      return "เสร็จสิ้น";
    default:
      return status || "-";
  }
}

export default function BookTour() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();

  const [schedule, setSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [scheduleError, setScheduleError] = useState("");

  const [participantCount, setParticipantCount] = useState(1);
  const [specialRequest, setSpecialRequest] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSchedule() {
      const result = await getScheduleDetail(scheduleId);

      if (!active) return;

      if (!result.success) {
        setScheduleError(
          result.error?.message || "ไม่สามารถโหลดข้อมูลรอบนำเที่ยวได้",
        );
        setLoadingSchedule(false);
        return;
      }

      setSchedule(result.data);
      setLoadingSchedule(false);
    }

    loadSchedule();

    return () => {
      active = false;
    };
  }, [scheduleId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    const count = Number(participantCount);

    if (!Number.isInteger(count) || count < 1) {
      setErrorMessage("จำนวนผู้เข้าร่วมต้องเป็นจำนวนเต็มอย่างน้อย 1 คน");
      return;
    }

    if (schedule && count > schedule.max_participants) {
      setErrorMessage(
        `จำนวนผู้เข้าร่วมต้องไม่เกิน ${schedule.max_participants} คน`,
      );
      return;
    }

    if (schedule?.status !== "OPEN") {
      setErrorMessage("รอบนำเที่ยวนี้ไม่เปิดรับการจอง");
      return;
    }

    setSubmitting(true);

    const result = await createBooking({
      scheduleId,
      participantCount: count,
      specialRequest,
    });

    if (!result.success) {
      setErrorMessage(result.error.message);
      setSubmitting(false);
      return;
    }

    navigate(`/bookings/${result.data.bookingId}`);
  }

  if (loadingSchedule) {
    return (
      <section className="mx-auto max-w-2xl py-8">
        <p className="text-textSecondary">กำลังโหลดข้อมูลรอบนำเที่ยว...</p>
      </section>
    );
  }

  if (scheduleError) {
    return (
      <section className="mx-auto max-w-2xl py-8">
        <ErrorState message={scheduleError} />
      </section>
    );
  }

  if (!schedule) {
    return (
      <section className="mx-auto max-w-2xl py-8">
        <ErrorState message="ไม่พบรอบนำเที่ยว" />
      </section>
    );
  }

  const isOpen = schedule.status === "OPEN";

  return (
    <section className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">
          จองรอบนำเที่ยว
        </h1>

        <p className="mt-1 text-sm text-textSecondary">
          ตรวจสอบรายละเอียดรอบและระบุจำนวนผู้เข้าร่วม
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-textSecondary">เส้นทาง</p>
            <p className="mt-1 text-lg font-semibold text-textPrimary">
              {schedule.routes?.name || "ไม่ระบุชื่อเส้นทาง"}
            </p>
          </div>

          {schedule.routes?.description && (
            <p className="text-sm text-textSecondary">
              {schedule.routes.description}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-textSecondary">วันที่</p>
              <p className="mt-1 font-medium text-textPrimary">
                {formatTourDate(schedule.tour_date)}
              </p>
            </div>

            <div>
              <p className="text-sm text-textSecondary">เวลา</p>
              <p className="mt-1 font-medium text-textPrimary">
                {formatTime(schedule.start_time)}
                {schedule.end_time
                  ? ` - ${formatTime(schedule.end_time)}`
                  : ""}
              </p>
            </div>

            <div>
              <p className="text-sm text-textSecondary">
                จำนวนผู้เข้าร่วมสูงสุด
              </p>
              <p className="mt-1 font-medium text-textPrimary">
                {schedule.max_participants} คน
              </p>
            </div>

            <div>
              <p className="text-sm text-textSecondary">สถานะรอบ</p>
              <p className="mt-1 font-medium text-textPrimary">
                {getStatusLabel(schedule.status)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {!isOpen && (
        <ErrorState message="รอบนำเที่ยวนี้ไม่เปิดรับการจอง" />
      )}

      {errorMessage && <ErrorState message={errorMessage} />}

      <Card>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="participantCount"
              className="mb-2 block text-sm font-medium text-textPrimary"
            >
              จำนวนผู้เข้าร่วม
            </label>

            <input
              id="participantCount"
              type="number"
              min="1"
              max={schedule.max_participants}
              step="1"
              value={participantCount}
              disabled={submitting || !isOpen}
              onChange={(event) => setParticipantCount(event.target.value)}
              className="w-full rounded-button border border-border bg-surface px-4 py-2 text-textPrimary outline-none focus:border-primary disabled:opacity-50"
              required
            />
          </div>

          <div>
            <label
              htmlFor="specialRequest"
              className="mb-2 block text-sm font-medium text-textPrimary"
            >
              คำขอพิเศษ
            </label>

            <textarea
              id="specialRequest"
              rows="4"
              value={specialRequest}
              disabled={submitting || !isOpen}
              onChange={(event) => setSpecialRequest(event.target.value)}
              placeholder="ระบุคำขอเพิ่มเติม หากมี"
              className="w-full rounded-button border border-border bg-surface px-4 py-2 text-textPrimary outline-none focus:border-primary disabled:opacity-50"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting || !scheduleId || !isOpen}
          >
            {submitting ? "กำลังจอง..." : "ยืนยันการจอง"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
