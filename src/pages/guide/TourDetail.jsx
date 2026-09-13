import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getMyTourManifest,
  updateTourAttendance,
} from '../../services/assignmentService';
import { completeTour } from '../../services/scheduleService';
export default function TourDetail() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();

  // State สำหรับจัดการ UI
  const [manifest, setManifest] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const fetchManifest = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      // เรียกใช้ฟังก์ชัน SQL แบบ Strict Privacy
      const res = await getMyTourManifest(scheduleId);

      if (!res.success) {
        throw new Error(
          res.error?.message || 'Unable to load tour manifest'
        );
      }

      setManifest(res.data || []);
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการโหลดรายชื่อลูกทัวร์: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchManifest();
  }, [scheduleId]);

  const handleAttendance = async (bookingId, status) => {
    try {
      const res = await updateTourAttendance(
        bookingId,
        status
      );

      if (!res.success) {
        throw new Error(
          res.error?.message || 'Unable to update attendance'
        );
      }

      // อัปเดตหน้าจอโดยไม่ต้องโหลดใหม่ทั้งหมด
      setManifest(prev => prev.map(b =>
        b.booking_id === bookingId ? { ...b, attendance_status: status } : b
      ));
    } catch (err) {
      alert('ไม่สามารถอัปเดตสถานะการเช็กอินได้: ' + err.message);
    }
  };

  const handleCompleteTour = async () => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการกดจบการนำเที่ยวรอบนี้? (การกระทำนี้ไม่สามารถย้อนกลับได้)')) return;

    setIsCompleting(true);
    try {
      // เรียกใช้ฟังก์ชัน Atomic Complete Tour อัปเดต 3 ส่วนรวดเดียว
      const res = await completeTour(scheduleId);

      if (!res.success) {
        throw new Error(
          res.error?.message || 'Unable to complete tour'
        );
      }

      alert('จบการนำเที่ยวเรียบร้อยแล้ว!');
      navigate('/guide'); // กลับไปหน้า Dashboard
    } catch (err) {
      alert('ไม่สามารถจบการนำเที่ยวได้: ' + err.message);
      setIsCompleting(false);
    }
  };

  const getAttendanceBadge = (status) => {
    const badges = {
      'NOT_CHECKED_IN': <span className="bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] px-2 py-1 rounded text-xs font-medium">ยังไม่เช็กอิน</span>,
      'CHECKED_IN': <span className="bg-[#16A34A] text-white px-2 py-1 rounded text-xs font-medium">เช็กอินแล้ว</span>,
      'NO_SHOW': <span className="bg-[#DC2626] text-white px-2 py-1 rounded text-xs font-medium">ไม่มาปรากฏตัว</span>,
    };
    return badges[status] || null;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/guide')}
          className="text-[#64748B] hover:text-[#7B5AA6] text-sm mb-6 flex items-center gap-1 font-medium transition-colors"
        >
          ← กลับไปหน้า Dashboard
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">รายละเอียดการนำเที่ยว (Tour Detail)</h1>
            <p className="text-[#64748B] text-sm mt-1">จัดการรายชื่อผู้เข้าร่วม เช็กอิน และดำเนินการนำเที่ยว</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* ปุ่มแจ้งเหตุ (เชื่อมกับโมดูล M5) */}
            <button
              onClick={() => navigate(`/incidents/new?scheduleId=${scheduleId}`)}
              className="bg-[#F59E0B] hover:bg-[#d97706] text-white px-4 py-2.5 rounded-[10px] font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              ⚠️ แจ้งเหตุฉุกเฉิน
            </button>

            {/* ปุ่มจบงาน (ของโมดูล M4) */}
            <button
              onClick={handleCompleteTour}
              disabled={isCompleting || isLoading}
              className="bg-[#16A34A] hover:bg-[#15803d] disabled:bg-[#94A3B8] text-white px-5 py-2.5 rounded-[10px] font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              {isCompleting ? 'กำลังประมวลผล...' : '✓ จบการนำเที่ยว (Complete)'}
            </button>
          </div>
        </div>

        {/* Error State */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-[#DC2626]/10 border border-[#DC2626] rounded-[10px] text-[#DC2626] text-sm">
            {errorMsg}
          </div>
        )}

        {/* ตารางแสดงรายชื่อลูกทัวร์ (Manifest) */}
        <div className="bg-[#FFFFFF] rounded-[12px] border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">ผู้จอง</th>
                  <th className="px-6 py-4 font-medium">จำนวน</th>
                  <th className="px-6 py-4 font-medium">คำขอพิเศษ</th>
                  <th className="px-6 py-4 font-medium">สถานะการเช็กอิน</th>
                  <th className="px-6 py-4 font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {/* Loading State */}
                {isLoading ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-[#64748B]">กำลังโหลดข้อมูลผู้เข้าร่วม...</td></tr>
                ) : manifest.length === 0 ? (
                  /* Empty State */
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-[#64748B]">ยังไม่มีผู้เข้าร่วมที่ยืนยันการจองในรอบนี้</td></tr>
                ) : (
                  /* Data State */
                  manifest.map((participant) => (
                    <tr key={participant.booking_id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-[#1E293B] font-medium">{participant.full_name}</div>
                        <div className="text-[#64748B] text-sm">{participant.phone || 'ไม่มีเบอร์โทร'}</div>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B]">{participant.participant_count} ท่าน</td>
                      <td className="px-6 py-4 text-[#64748B] text-sm max-w-[200px] truncate" title={participant.special_request}>
                        {participant.special_request || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {getAttendanceBadge(participant.attendance_status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAttendance(participant.booking_id, 'CHECKED_IN')}
                            className="px-3 py-1 bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B] rounded hover:bg-[#16A34A] hover:text-white hover:border-[#16A34A] text-xs font-medium transition-colors"
                          >
                            มา
                          </button>
                          <button
                            onClick={() => handleAttendance(participant.booking_id, 'NO_SHOW')}
                            className="px-3 py-1 bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B] rounded hover:bg-[#DC2626] hover:text-white hover:border-[#DC2626] text-xs font-medium transition-colors"
                          >
                            ไม่มา
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}