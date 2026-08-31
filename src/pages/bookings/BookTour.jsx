import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ErrorState from "../../components/common/ErrorState";
import { createBooking } from "../../services/bookingService";

export default function BookTour() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();

  const [participantCount, setParticipantCount] = useState(1);
  const [specialRequest, setSpecialRequest] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    const count = Number(participantCount);

    if (!Number.isInteger(count) || count < 1) {
      setErrorMessage("จำนวนผู้เข้าร่วมต้องเป็นจำนวนเต็มอย่างน้อย 1 คน");
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

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">จองรอบนำเที่ยว</h1>

        <p className="mt-1 text-sm text-textSecondary">
          ระบุจำนวนผู้เข้าร่วมและคำขอพิเศษสำหรับการจอง
        </p>
      </div>

      {errorMessage && <ErrorState message={errorMessage} />}

      <Card>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <p className="text-sm text-textSecondary">รหัสรอบนำเที่ยว</p>

            <p className="mt-1 break-all font-medium text-textPrimary">
              {scheduleId || "-"}
            </p>
          </div>

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
              step="1"
              value={participantCount}
              disabled={submitting}
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
              disabled={submitting}
              onChange={(event) => setSpecialRequest(event.target.value)}
              placeholder="ระบุคำขอเพิ่มเติม หากมี"
              className="w-full rounded-button border border-border bg-surface px-4 py-2 text-textPrimary outline-none focus:border-primary disabled:opacity-50"
            />
          </div>

          <Button type="submit" disabled={submitting || !scheduleId}>
            {submitting ? "กำลังจอง..." : "ยืนยันการจอง"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
