import AppSelect from '../../components/common/AppSelect'
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import { formatDateTime } from "../../utils/dateTime";
import { getStatusLabel } from "../../utils/status";
import { getIncidentSeverityLabel } from "../../utils/incidentDisplay";
import { listIncidentsForAdmin } from "../../services/incidentService";

const STATUS_OPTIONS = [
  { value: "", label: "ทุกสถานะ" },
  { value: "OPEN", label: getStatusLabel("OPEN") },
  { value: "IN_PROGRESS", label: getStatusLabel("IN_PROGRESS") },
  { value: "RESOLVED", label: getStatusLabel("RESOLVED") },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "ทุกระดับ" },
  { value: "LOW", label: getIncidentSeverityLabel("LOW") },
  { value: "MEDIUM", label: getIncidentSeverityLabel("MEDIUM") },
  { value: "HIGH", label: getIncidentSeverityLabel("HIGH") },
  { value: "EMERGENCY", label: getIncidentSeverityLabel("EMERGENCY") },
];

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
      let result;
      try {
        result = await listIncidentsForAdmin({
          status: statusFilter || undefined,
          severity: severityFilter || undefined,
        });
      } catch {
        if (!cancelled) {
          setIncidents([]);
          setError('เชื่อมต่อเพื่อโหลดรายการเหตุการณ์ไม่สำเร็จ กรุณาลองใหม่');
          setLoading(false);
        }
        return;
      }

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
        <p className="text-sm font-medium text-primary">ระบบจัดการเหตุการณ์</p>

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
              กรองตามสถานะ
            </label>

            <AppSelect
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
            </AppSelect>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="incident-severity-filter"
              className="text-sm text-textSecondary"
            >
              กรองตามระดับความรุนแรง
            </label>

            <AppSelect
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
            </AppSelect>
          </div>

          <div className="flex items-end">
            <Button
              variant="secondary"
              disabled={!statusFilter && !severityFilter}
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
        <p className="mt-3 text-xs text-textSecondary">
          ตัวกรองใช้ค้นหาเหตุการณ์เท่านั้น หากต้องการเปลี่ยนสถานะ ให้กด “ดูรายละเอียด” ของรายการนั้น
        </p>
      </Card>

      {loading ? (
        <LoadingState message="กำลังโหลดรายการเหตุการณ์..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : incidents.length === 0 ? (
        <EmptyState
          title="ไม่พบเหตุการณ์ตามเงื่อนไขที่เลือก"
          description="ลองปรับตัวกรองสถานะหรือระดับความรุนแรง"
        />
      ) : (
        <Card className="min-w-0 overflow-hidden p-0">
          {/* Show readable cards below wide desktop; never require horizontal scrolling. */}
          <div className="grid gap-3 p-3 xl:grid-cols-2 2xl:hidden">
            {incidents.map((incident) => (
              <article
                key={incident.id}
                className="rounded-card border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-semibold text-textPrimary">
                      {incident.type}
                    </h2>
                    <p className="mt-1 break-words text-sm text-textSecondary">
                      {incident.description}
                    </p>
                  </div>
                  <StatusBadge status={incident.status} />
                </div>

                <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-textSecondary">ความรุนแรง</dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-background px-3 py-1 text-xs font-medium text-textPrimary">
                        {getIncidentSeverityLabel(incident.severity)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-textSecondary">วันที่รายงาน</dt>
                    <dd className="mt-1 text-textPrimary">
                      {formatDateTime(incident.created_at)}
                    </dd>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-textSecondary">รหัสรอบนำเที่ยว</dt>
                    <dd className="mt-1 break-all text-textPrimary">
                      {incident.schedule_id}
                    </dd>
                  </div>
                </dl>

                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4 w-full whitespace-nowrap"
                  onClick={() => navigate(`/admin/incidents/${incident.id}`)}
                >
                  ดูรายละเอียด
                </Button>
              </article>
            ))}
          </div>

          {/* Wide desktop: five flexible columns; date shares the schedule cell. */}
          <div className="hidden 2xl:block">
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col style={{ width: '28%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '17%' }} />
              </colgroup>
              <thead className="border-b border-border bg-background">
                <tr className="text-sm text-textSecondary">
                  <th className="px-4 py-3 font-medium">เหตุการณ์</th>
                  <th className="px-4 py-3 font-medium">รอบนำเที่ยว / วันที่</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">ความรุนแรง</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">สถานะ</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">จัดการ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="transition hover:bg-background"
                  >
                    <td className="min-w-0 px-4 py-4">
                      <p className="truncate font-medium text-textPrimary" title={incident.type}>
                        {incident.type}
                      </p>

                      <p className="mt-1 truncate text-sm text-textSecondary" title={incident.description}>
                        {incident.description}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-sm text-textSecondary">
                      <p className="break-all">{incident.schedule_id}</p>
                      <p className="mt-1 whitespace-nowrap text-xs">
                        {formatDateTime(incident.created_at)}
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-background px-3 py-1 text-xs font-medium text-textPrimary">
                        {getIncidentSeverityLabel(incident.severity)}
                      </span>
                    </td>

                    <td className="px-3 py-4">
                      <StatusBadge status={incident.status} />
                    </td>

                    <td className="px-3 py-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="whitespace-nowrap"
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
