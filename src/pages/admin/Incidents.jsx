import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import Button from "../../components/common/Button";
import { listIncidentsForAdmin } from "../../services/incidentService";

const STATUS_OPTIONS = [
  { value: "", label: "ทุกสถานะ" },
  { value: "OPEN", label: "OPEN" },
  { value: "IN_PROGRESS", label: "IN PROGRESS" },
  { value: "RESOLVED", label: "RESOLVED" },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "ทุกระดับ" },
  { value: "LOW", label: "LOW" },
  { value: "MEDIUM", label: "MEDIUM" },
  { value: "HIGH", label: "HIGH" },
  { value: "EMERGENCY", label: "EMERGENCY" },
];

function formatDateTime(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminIncidents() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchIncidents() {
      const result = await listIncidentsForAdmin({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      });

      if (cancelled) return;

      if (!result.success) {
        setIncidents([]);
        setError(result.error?.message || "ไม่สามารถโหลดรายการเหตุการณ์ได้");
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
  }, [statusFilter, severityFilter]);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">Incident Management</p>

        <h1 className="mt-1 text-2xl font-bold text-textPrimary">
          จัดการเหตุการณ์
        </h1>

        <p className="mt-1 text-sm text-textSecondary">
          ตรวจสอบเหตุการณ์ที่ถูกรายงานระหว่างการนำเที่ยว
        </p>
      </div>

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="incident-status-filter"
              className="text-sm text-textSecondary"
            >
              สถานะ
            </label>

            <select
              id="incident-status-filter"
              value={statusFilter}
              onChange={(event) => {
                setLoading(true);
                setError("");
                setStatusFilter(event.target.value);
              }}
              className="rounded-input border border-border bg-surface px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "ALL"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="incident-severity-filter"
              className="text-sm text-textSecondary"
            >
              ระดับความรุนแรง
            </label>

            <select
              id="incident-severity-filter"
              value={severityFilter}
              onChange={(event) => {
                setLoading(true);
                setError("");
                setSeverityFilter(event.target.value);
              }}
              className="rounded-input border border-border bg-surface px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value || "ALL"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => {
                setLoading(true);
                setError("");
                setStatusFilter("");
                setSeverityFilter("");
              }}
            >
              ล้างตัวกรอง
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingState message="กำลังโหลดรายการเหตุการณ์..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : incidents.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-textSecondary">
            ไม่พบเหตุการณ์ตามเงื่อนไขที่เลือก
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-background">
                <tr className="text-sm text-textSecondary">
                  <th className="px-4 py-3 font-medium">เหตุการณ์</th>
                  <th className="px-4 py-3 font-medium">Schedule</th>
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">วันที่รายงาน</th>
                  <th className="px-4 py-3 font-medium">จัดการ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="transition hover:bg-background"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-textPrimary">
                        {incident.type}
                      </p>

                      <p className="mt-1 max-w-md truncate text-sm text-textSecondary">
                        {incident.description}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-sm text-textSecondary">
                      {incident.schedule_id}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-textPrimary">
                        {incident.severity}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-textPrimary">
                        {incident.status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-textSecondary">
                      {formatDateTime(incident.created_at)}
                    </td>

                    <td className="px-4 py-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(`/admin/incidents/${incident.id}`)
                        }
                      >
                        ดูรายละเอียด
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
