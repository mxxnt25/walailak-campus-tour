import AppSelect from '../../components/common/AppSelect'
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import { useAuth } from "../../hooks/useAuth";

import { getRouteDetail, listRouteStops } from "../../services/routeService";

import {
  getScheduleCapacity,
  isScheduleExpired,
  listMyBookings,
} from "../../services/bookingService";

import { listPublicSchedules } from "../../services/scheduleService";

import { formatDate, formatTime } from "../../utils/dateTime";

import CampusMap from "./CampusMap";
import RouteCover from "../../components/routes/RouteCover";
import RouteReviews from "../../components/reviews/RouteReviews";
import { getSafeRouteImageUrl } from "../../utils/routeDiscovery";

function getScheduleStatusLabel(schedule, now) {
  if (isScheduleExpired(schedule, now)) {
    return "รอบเริ่มแล้ว";
  }

  switch (schedule.status) {
    case "OPEN":
      return "เปิดรับจอง";

    case "FULL":
      return "เต็มแล้ว";

    case "CLOSED":
      return "ปิดรับจอง";

    case "CANCELLED":
      return "ยกเลิก";

    case "COMPLETED":
      return "เสร็จสิ้น";

    default:
      return schedule.status || "-";
  }
}

function isScheduleBookable(schedule, now) {
  if (schedule.status !== "OPEN") {
    return false;
  }

  if (isScheduleExpired(schedule, now)) {
    return false;
  }

  if (schedule.remaining_seats == null) {
    return true;
  }

  return schedule.remaining_seats > 0;
}

function getUnavailableButtonLabel(schedule, now) {
  if (isScheduleExpired(schedule, now)) {
    return "รอบนี้เริ่มแล้ว";
  }

  if (schedule.status === "FULL" || schedule.remaining_seats === 0) {
    return "รอบนี้เต็มแล้ว";
  }

  if (schedule.status === "COMPLETED") {
    return "รอบนี้เสร็จสิ้นแล้ว";
  }

  if (schedule.status === "CANCELLED") {
    return "รอบนี้ถูกยกเลิก";
  }

  if (schedule.status === "CLOSED") {
    return "ปิดรับจองแล้ว";
  }

  return "ไม่เปิดรับจอง";
}

function RouteDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const requestedDate = searchParams.get("date");

  const { session, profile, loading: authLoading, profileLoading } = useAuth();

  const [route, setRoute] = useState(null);
  const [stops, setStops] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [existingBookingsBySchedule, setExistingBookingsBySchedule] = useState(
    {},
  );
  const [clockNow, setClockNow] = useState(() => new Date());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scheduleError, setScheduleError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadRoute() {
      const routeResult = await getRouteDetail(id);

      if (!active) return;

      if (!routeResult.success) {
        setError(routeResult.error?.message || "ไม่สามารถโหลดข้อมูลเส้นทางได้");

        setLoading(false);
        return;
      }

      const [stopsResult, schedulesResult] = await Promise.all([
        listRouteStops(id),
        listPublicSchedules(id),
      ]);

      if (!active) return;

      setRoute(routeResult.data);

      if (stopsResult.success) {
        setStops(stopsResult.data ?? []);
      } else {
        setError(stopsResult.error?.message || "ไม่สามารถโหลดจุดแวะชมได้");
      }

      if (schedulesResult.success) {
        const publicSchedules = schedulesResult.data ?? [];

        const schedulesWithCapacity = await Promise.all(
          publicSchedules.map(async (schedule) => {
            const capacityResult = await getScheduleCapacity(schedule.id);

            if (!capacityResult.success) {
              return {
                ...schedule,
                booked_participants: null,
                remaining_seats: schedule.status === "FULL" ? 0 : null,
              };
            }

            return {
              ...schedule,
              max_participants: capacityResult.data.maxParticipants,
              booked_participants: capacityResult.data.bookedParticipants,
              remaining_seats: capacityResult.data.remainingSeats,
              status: capacityResult.data.status,
            };
          }),
        );

        if (!active) return;

        // Refresh the clock after asynchronous capacity requests finish.
        setClockNow(new Date());
        setSchedules(schedulesWithCapacity);

        setSelectedDate(
          schedulesWithCapacity.some((schedule) => schedule.tour_date === requestedDate)
            ? requestedDate
            : schedulesWithCapacity[0]?.tour_date ?? "",
        );
      } else {
        setScheduleError(
          schedulesResult.error?.message || "ไม่สามารถโหลดรอบนำเที่ยวได้",
        );
      }

      setLoading(false);
    }

    loadRoute();

    return () => {
      active = false;
    };
  }, [id, requestedDate]);

  // Nothing on this screen shows a live countdown. Updating the whole page
  // every second repaints its cards and can interrupt map interactions.
  // Update only when a future tour actually crosses its start time.
  useEffect(() => {
    let pending = schedules.filter((schedule) =>
      schedule.tour_date && schedule.start_time && !isScheduleExpired(schedule, new Date())
    );
    if (pending.length === 0) return undefined;

    const timerId = window.setInterval(() => {
      const now = new Date();
      const upcoming = pending.filter((schedule) => !isScheduleExpired(schedule, now));
      if (upcoming.length !== pending.length) {
        pending = upcoming;
        setClockNow(now);
      }
      if (pending.length === 0) window.clearInterval(timerId);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [schedules]);

  useEffect(() => {
    let active = true;

    async function loadExistingBookings() {
      if (authLoading || profileLoading) {
        return;
      }

      if (!session?.user || profile?.role !== "MEMBER") {
        if (active) {
          setExistingBookingsBySchedule({});
        }
        return;
      }

      const result = await listMyBookings();

      if (!active) {
        return;
      }

      if (!result.success) {
        setExistingBookingsBySchedule({});
        return;
      }

      const bookingMap = {};

      for (const booking of result.data ?? []) {
        if (
          booking.status === "CONFIRMED" &&
          booking.schedule_id &&
          !bookingMap[booking.schedule_id]
        ) {
          bookingMap[booking.schedule_id] = booking;
        }
      }

      setExistingBookingsBySchedule(bookingMap);
    }

    loadExistingBookings();

    return () => {
      active = false;
    };
  }, [authLoading, profileLoading, session?.user, profile?.role]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="rounded-xl border border-border bg-white p-8 text-center text-textSecondary">
          กำลังโหลดรายละเอียดเส้นทาง...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="rounded-xl border border-danger/30 bg-white p-6 text-danger">
          {error}
        </div>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <EmptyState
          title="ไม่พบเส้นทาง"
          description="ไม่พบข้อมูลเส้นทางที่คุณกำลังค้นหา"
        />
      </div>
    );
  }

  const coverPhoto = stops
    .map((stop) => getSafeRouteImageUrl(stop.image_url))
    .find(Boolean) ?? null;

  const availableDates = [
    ...new Set(schedules.map((schedule) => schedule.tour_date)),
  ];

  const filteredSchedules = selectedDate
    ? schedules.filter((schedule) => schedule.tour_date === selectedDate)
    : [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <section className={`rounded-2xl border border-border bg-white p-6 shadow-sm ${coverPhoto ? "grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.75fr)]" : ""}`}>
        <div>
          <h1 className="break-words text-3xl font-bold text-textPrimary">{route.name}</h1>
          {route.description && <p className="mt-3 text-textSecondary">{route.description}</p>}
          <a href="#reviews" className="mt-4 inline-flex rounded-xl border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5">
            อ่านรีวิวของเส้นทางนี้ →
          </a>
          {route.duration_minutes && (
            <p className="mt-4 text-sm text-textSecondary">ระยะเวลาโดยประมาณ {route.duration_minutes} นาที</p>
          )}
        </div>
        {coverPhoto && <RouteCover src={coverPhoto} alt={`ภาพเส้นทาง ${route.name}`} className="h-48 w-full rounded-xl md:h-full md:min-h-48" />}
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold text-textPrimary">
          รอบนำเที่ยวที่เปิดให้เข้าร่วม
        </h2>

        {scheduleError ? (
          <div className="mt-4 rounded-xl border border-danger/30 bg-white p-6 text-danger">
            {scheduleError}
          </div>
        ) : schedules.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="ยังไม่มีรอบนำเที่ยว"
              description="ขณะนี้ยังไม่มีรอบนำเที่ยวที่เปิดให้เข้าร่วม"
            />
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="max-w-sm">
              <label
                htmlFor="tourDate"
                className="mb-2 block text-sm font-medium text-textPrimary"
              >
                เลือกวันที่ต้องการเข้าร่วม
              </label>

              <AppSelect
                id="tourDate"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-textPrimary outline-none focus:border-primary"
              >
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDate(date)}
                  </option>
                ))}
              </AppSelect>
            </div>

            <div>
              <h3 className="font-semibold text-textPrimary">
                รอบนำเที่ยวในวันที่เลือก
              </h3>

              {filteredSchedules.length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    title="ไม่มีรอบในวันที่เลือก"
                    description="ลองเลือกวันที่อื่นเพื่อดูรอบนำเที่ยวที่เปิดให้เข้าร่วม"
                  />
                </div>
              ) : (
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {filteredSchedules.map((schedule) => {
                    const bookable = isScheduleBookable(schedule, clockNow);

                    const expired = isScheduleExpired(schedule, clockNow);

                    const existingBooking =
                      existingBookingsBySchedule[schedule.id] ?? null;

                    const authReady = !authLoading && !profileLoading;

                    const isGuest = !session?.user;
                    const isMember = profile?.role === "MEMBER";

                    return (
                      <article
                        key={schedule.id}
                        className="rounded-xl border border-border bg-white p-5 shadow-sm"
                      >
                        <p className="font-semibold text-textPrimary">
                          {formatDate(schedule.tour_date)}
                        </p>

                        <p className="mt-2 text-sm text-textSecondary">
                          เวลา {formatTime(schedule.start_time)}
                          {schedule.end_time
                            ? ` - ${formatTime(schedule.end_time)}`
                            : ""}
                        </p>

                        <p className="mt-2 text-sm text-textSecondary">
                          รองรับสูงสุด {schedule.max_participants} คน
                        </p>

                        {schedule.booked_participants != null && (
                          <p className="mt-1 text-sm text-textSecondary">
                            จองแล้ว {schedule.booked_participants} คน
                          </p>
                        )}

                        {schedule.remaining_seats != null && (
                          <p className="mt-1 text-sm text-textSecondary">
                            เหลือ {schedule.remaining_seats} ที่
                          </p>
                        )}

                        <p className="mt-1 text-sm font-medium text-textPrimary">
                          สถานะ {getScheduleStatusLabel(schedule, clockNow)}
                        </p>

                        {expired && (
                          <p className="mt-2 text-sm text-danger">
                            หมดเวลาจอง รอบนำเที่ยวนี้เริ่มแล้ว
                            ไม่สามารถทำการจองได้
                          </p>
                        )}

                        <div className="mt-4">
                          {isMember && existingBooking ? (
                            <Link to={`/bookings/${existingBooking.id}`} className="inline-flex items-center justify-center rounded-button bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">ดูรายการจองเดิม</Link>
                          ) : !bookable ? (
                            <Button disabled>
                              {getUnavailableButtonLabel(schedule, clockNow)}
                            </Button>
                          ) : !authReady ? (
                            <Button disabled>กำลังตรวจสอบสิทธิ์...</Button>
                          ) : isGuest ? (
                            <Link
                              to={`/login?returnTo=${encodeURIComponent(`/routes/${id}?date=${selectedDate}`)}`}
                              state={{
                                from: {
                                  pathname: `/routes/${id}`,
                                  search: `?date=${selectedDate}`,
                                },
                              }}
                              className="inline-flex items-center justify-center rounded-button bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                              เข้าสู่ระบบเพื่อจอง
                            </Link>
                          ) : isMember ? (
                            <Link to={`/book/${schedule.id}`} className="inline-flex items-center justify-center rounded-button bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">จองรอบนี้</Link>
                          ) : (
                            <p className="text-sm text-textSecondary">
                              บัญชีบทบาทนี้ไม่สามารถจองรอบนำเที่ยวแบบสมาชิกได้
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold text-textPrimary">จุดแวะชม</h2>

        {stops.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="ยังไม่มีจุดแวะชม"
              description="เส้นทางนี้ยังไม่มีข้อมูลจุดแวะชม"
            />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {stops.map((stop) => (
              <article
                key={stop.id}
                className="rounded-xl border border-border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {getSafeRouteImageUrl(stop.image_url) && (
                    <RouteCover src={stop.image_url} alt={`ภาพจุดแวะชม ${stop.name}`} className="h-40 w-full shrink-0 rounded-xl sm:w-52" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-textSecondary">จุดที่ {stop.stop_order}</div>
                    <h3 className="mt-1 break-words text-xl font-semibold text-textPrimary">{stop.name}</h3>
                    {stop.description && <p className="mt-2 text-textSecondary">{stop.description}</p>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold text-textPrimary">
          แผนที่เส้นทาง
        </h2>

        <div className="mt-4">
          <CampusMap stops={stops} />
        </div>
      </section>

      <RouteReviews key={id} routeId={id} />
    </div>
  );
}

export default RouteDetail;
