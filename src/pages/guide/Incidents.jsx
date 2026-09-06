import { useEffect, useState } from "react";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { listMyRelatedIncidents } from "../../services/incidentService";

function formatDateTime(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSeverityColor(severity) {
  switch (severity) {
    case "LOW":
      return "primary";
    case "MEDIUM":
      return "warning";
    case "HIGH":
    case "EMERGENCY":
      return "danger";
    default:
      return "primary";
  }
}

function getStatusColor(status) {
  switch (status) {
    case "OPEN":
      return "warning";
    case "IN_PROGRESS":
      return "primary";
    case "RESOLVED":
      return "success";
    default:
      return "primary";
  }
}

function getStatusLabel(status) {
  switch (status) {
    case "OPEN":
      return "OPEN";
    case "IN_PROGRESS":
      return "IN PROGRESS";
    case "RESOLVED":
      return "RESOLVED";
    default:
      return status || "-";
  }
}

export default function GuideIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchIncidents() {
      const result = await listMyRelatedIncidents();

      if (cancelled) return;

      if (!result.success) {
        setIncidents([]);
        setError(
          result.error?.message || "ไม่สามารถโหลดรายการเหตุการณ์ของคุณได้"
        );
        setLoading(false);
        return;
      }

      setIncidents(result.data || []);
      setError("");
      setLoading(false);
    }

    fetchIncidents();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">Incident Reporting</p>

        <h1 className="mt-1 text-2xl font-bold text-textPrimary">
          เหตุการณ์ที่เกี่ยวข้องกับคุณ
        </h1>

        <p className="mt-1 text-sm text-textSecondary">
          ตรวจสอบเหตุการณ์ของตารางนำเที่ยวที่คุณได้รับมอบหมาย
        </p>
      </div>

      {loading ? (
        <LoadingState message="กำลังโหลดรายการเหตุการณ์..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : incidents.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <p className="font-medium text-textPrimary">
              ยังไม่มีเหตุการณ์ที่เกี่ยวข้อง
            </p>

            <p className="mt-1 text-sm text-textSecondary">
              เหตุการณ์ของตารางนำเที่ยวที่คุณได้รับมอบหมายจะแสดงที่นี่
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {incidents.map((incident) => (
            <Card key={incident.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-textSecondary">ประเภทเหตุการณ์</p>

                  <h2 className="mt-1 text-lg font-semibold text-textPrimary">
                    {incident.type}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge color={getSeverityColor(incident.severity)}>
                    {incident.severity}
                  </Badge>

                  <Badge color={getStatusColor(incident.status)}>
                    {getStatusLabel(incident.status)}
                  </Badge>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-textSecondary">รายละเอียด</p>

                <p className="mt-1 whitespace-pre-wrap text-sm text-textPrimary">
                  {incident.description}
                </p>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-textSecondary">Schedule ID</dt>
                    <dd className="mt-1 break-all text-textPrimary">
                      {incident.schedule_id}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-textSecondary">วันที่รายงาน</dt>
                    <dd className="mt-1 text-textPrimary">
                      {formatDateTime(incident.created_at)}
                    </dd>
                  </div>
                </dl>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
