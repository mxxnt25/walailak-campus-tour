import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ErrorState from "../../components/common/ErrorState";

import {
  createBooking,
  getMyConfirmedBookingForSchedule,
  getScheduleCapacity,
  isScheduleExpired,
} from "../../services/bookingService";
import { formatDate, formatTime } from "../../utils/dateTime";

import { getStatusLabel as getSharedStatusLabel } from "../../utils/status";

import { getScheduleDetail } from "../../services/scheduleService";

function getScheduleStatusLabel(status) {
  if (status === "FULL") {
    return "เต็มแล้ว";
  }

  return getSharedStatusLabel(status);
}

export default function BookTour() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();

  const [schedule, setSchedule] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [existingBooking, setExistingBooking] = useState(null);
  const [clockNow, setClockNow] = useState(() => new Date());

  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [scheduleError, setScheduleError] = useState("");

  const [participantCount, setParticipantCount] = useState(1);
  const [specialRequest, setSpecialRequest] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSchedule() {
      const [
        scheduleResult,
        capacityResult,
        existingBookingResult,
      ] = await Promise.all([
        getScheduleDetail(scheduleId),
        getScheduleCapacity(scheduleId),
        getMyConfirmedBookingForSchedule(scheduleId),
      ]);

      if (!active) return;

      if (!scheduleResult.success) {
        setScheduleError(
          scheduleResult.error?.message || "ไม่สามารถโหลดข้อมูลรอบนำเที่ยวได้",
        );

        setLoadingSchedule(false);
        return;
      }

      setSchedule(scheduleResult.data);

      if (capacityResult.success) {
        setCapacity(capacityResult.data);
      } else {
        setCapacity(null);
      }

      if (existingBookingResult.success) {
        setExistingBooking(existingBookingResult.data);
      } else {
        setExistingBooking(null);
      }

      setLoadingSchedule(false);
    }

    loadSchedule();

    return () => {
      active = false;
    };
  }, [scheduleId]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setClockNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");

    if (existingBooking) {
      setErrorMessage(
        "คุณมีรายการจองที่ยืนยันแล้วสำหรับรอบนี้อยู่แล้ว",
      );
      return;
    }

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

    if (capacity?.remainingSeats != null && count > capacity.remainingSeats) {
      setErrorMessage(`รอบนี้เหลือที่ว่าง ${capacity.remainingSeats} คน`);

      return;
    }

    if ((capacity?.status ?? schedule?.status) !== "OPEN") {
      setErrorMessage("รอบนำเที่ยวนี้ไม่เปิดรับการจอง");

      return;
    }

    if (isScheduleExpired(schedule)) {
      setErrorMessage("หมดเวลาจอง รอบนำเที่ยวนี้เริ่มแล้ว ไม่สามารถทำการจองได้");

      return;
    }

    setSubmitting(true);

    const result = await createBooking({
      scheduleId,
      participantCount: count,
      specialRequest,
    });

    if (!result.success) {
      if (result.error?.code === "DUPLICATE_BOOKING") {
        const existingResult =
          await getMyConfirmedBookingForSchedule(scheduleId);

        if (existingResult.success) {
          setExistingBooking(existingResult.data);
        }
      }

      setErrorMessage(result.error?.message || "ไม่สามารถสร้างการจองได้");

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

  const effectiveStatus = capacity?.status ?? schedule.status;

  const remainingSeats = capacity?.remainingSeats ?? null;

  const isExpired = isScheduleExpired(schedule, clockNow);

  const isOpen =
    effectiveStatus === "OPEN" &&
    !isExpired &&
    !existingBooking &&
    (remainingSeats == null || remainingSeats > 0);

  const participantMaximum =
    remainingSeats != null
      ? Math.min(schedule.max_participants, remainingSeats)
      : schedule.max_participants;

  return (
    <section className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">จองรอบนำเที่ยว</h1>

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
                {formatDate(schedule.tour_date)}
              </p>
            </div>

            <div>
              <p className="text-sm text-textSecondary">เวลา</p>

              <p className="mt-1 font-medium text-textPrimary">
                {formatTime(schedule.start_time)}

                {schedule.end_time ? ` - ${formatTime(schedule.end_time)}` : ""}
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

            {capacity && (
              <>
                <div>
                  <p className="text-sm text-textSecondary">จองแล้ว</p>

                  <p className="mt-1 font-medium text-textPrimary">
                    {capacity.bookedParticipants} คน
                  </p>
                </div>

                <div>
                  <p className="text-sm text-textSecondary">ที่ว่างคงเหลือ</p>

                  <p className="mt-1 font-medium text-textPrimary">
                    {capacity.remainingSeats} คน
                  </p>
                </div>
              </>
            )}

            <div>
              <p className="text-sm text-textSecondary">สถานะรอบ</p>

              <p className="mt-1 font-medium text-textPrimary">
                {getScheduleStatusLabel(effectiveStatus)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {!isOpen && !existingBooking && (
        <ErrorState
          message={
            isExpired
              ? "หมดเวลาจอง รอบนำเที่ยวนี้เริ่มแล้ว ไม่สามารถทำการจองได้"
              : effectiveStatus === "FULL" || remainingSeats === 0
                ? "รอบนำเที่ยวนี้เต็มแล้ว"
                : "รอบนำเที่ยวนี้ไม่เปิดรับการจอง"
          }
        />
      )}

      {existingBooking && (
        <Card>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-textPrimary">
                คุณมีรายการจองที่ยืนยันแล้วสำหรับรอบนี้
              </p>

              <p className="mt-1 text-sm text-textSecondary">
                หนึ่งสมาชิกสามารถมีรายการจองที่ยืนยันแล้วได้หนึ่งรายการต่อรอบ
              </p>
            </div>

            <Button
              type="button"
              onClick={() => navigate(`/bookings/${existingBooking.id}`)}
            >
              ดูรายการจองเดิม
            </Button>
          </div>
        </Card>
      )}

      {errorMessage && <ErrorState message={errorMessage} />}

      {!existingBooking && (
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
              max={participantMaximum}
              step="1"
              value={participantCount}
              disabled={submitting || !isOpen}
              onChange={(event) => setParticipantCount(event.target.value)}
              className="w-full rounded-button border border-border bg-surface px-4 py-2 text-textPrimary outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
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
              className="w-full rounded-button border border-border bg-surface px-4 py-2 text-textPrimary outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <Button type="submit" disabled={submitting || !isOpen}>
            {submitting ? "กำลังจอง..." : "ยืนยันการจอง"}
          </Button>
          </form>
        </Card>
      )}
    </section>
  );
}
