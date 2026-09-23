import { Confirm, Feedback } from "../../components/m4/Feedback";
import { statusLabel } from "../../services/m4/rules";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { listAllRoutes, deleteRoute } from "../../services/routeService";

import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import LoadingState from "../../components/common/LoadingState";

export default function AdminRoutes() {
  const navigate = useNavigate();

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");

  async function loadRoutes() {
    setLoading(true);
    setError("");

    try {
      const result = await listAllRoutes();

      if (!result.success) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      setRoutes(result.data || []);
    } catch {
      setError("โหลดเส้นทางไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(route) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await deleteRoute(route.id);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setDeleting(null);
      setSuccess("ลบเส้นทางเรียบร้อยแล้ว");
      await loadRoutes();
    } catch {
      setError("ลบเส้นทางไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadRoutes, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div>
      <Feedback error={error} success={success} />
      {error && (
        <Button onClick={loadRoutes} disabled={busy}>
          โหลดข้อมูลใหม่
        </Button>
      )}
      {deleting && (
        <Confirm
          title="ลบเส้นทาง"
          busy={busy}
          error={error}
          onClose={() => setDeleting(null)}
          onConfirm={() => handleDelete(deleting)}
        >
          ยืนยันลบเส้นทาง “{deleting.name}” หรือไม่?
          หากมีประวัติใช้งานให้ปิดใช้งานแทน
        </Confirm>
      )}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">จัดการเส้นทาง</h1>

          <p className="mt-1 text-sm text-textSecondary">
            เส้นทางทั้งหมด {routes.length} เส้นทาง
          </p>
        </div>

        <Button onClick={() => navigate("/admin/routes/new")}>
          + สร้างเส้นทาง
        </Button>
      </div>

      {routes.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <p className="text-textSecondary">ยังไม่มีเส้นทางที่เปิดใช้งาน</p>

            <Button
              className="mt-4"
              onClick={() => navigate("/admin/routes/new")}
            >
              สร้างเส้นทางแรก
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {routes.map((route) => (
            <Card
              key={route.id}
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-textPrimary">
                    {route.name}
                  </h2>

                  <Badge
                    color={route.status === "ACTIVE" ? "success" : "warning"}
                  >
                    {statusLabel(route.status)}
                  </Badge>
                </div>

                {route.description && (
                  <p className="mt-1 text-sm text-textSecondary">
                    {route.description}
                  </p>
                )}

                <p className="mt-2 text-sm text-textSecondary">
                  ระยะเวลา:{" "}
                  {route.duration_minutes
                    ? `${route.duration_minutes} นาที`
                    : "ไม่ระบุ"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/routes/${route.id}`)}
                >
                  ดู
                </Button>

                <Button
                  size="sm"
                  onClick={() => navigate(`/admin/routes/${route.id}/edit`)}
                >
                  แก้ไข
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setDeleting(route);
                  }}
                >
                  ลบ
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
