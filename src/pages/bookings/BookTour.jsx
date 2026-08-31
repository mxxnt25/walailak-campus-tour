import { useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ErrorState from "../../components/common/ErrorState";

export default function BookTour() {
  const { scheduleId } = useParams();

  const [participantCount, setParticipantCount] = useState(1);
  const [specialRequest, setSpecialRequest] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    const count = Number(participantCount);

    if (!Number.isInteger(count) || count < 1) {
      setErrorMessage("จำนวนผู้เข้าร่วมต้องเป็นจำนวนเต็มอย่างน้อย 1 คน");
      return;
    }

    // createBooking จะเชื่อมในขั้น M3 ↔ M4 integration
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
            <p className="mt-1 font-medium text-textPrimary">
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
              onChange={(event) => setParticipantCount(event.target.value)}
              className="w-full rounded-button border border-border bg-surface px-4 py-2 text-textPrimary outline-none focus:border-primary"
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
              onChange={(event) => setSpecialRequest(event.target.value)}
              placeholder="ระบุคำขอเพิ่มเติม หากมี"
              className="w-full rounded-button border border-border bg-surface px-4 py-2 text-textPrimary outline-none focus:border-primary"
            />
          </div>

          <Button type="submit">ยืนยันการจอง</Button>
        </form>
      </Card>
    </section>
  );
}
