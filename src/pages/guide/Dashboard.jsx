import React, { useState, useEffect } from 'react';
// 1. ดึงข้อมูลตารางงานจาก M4 ของเราเอง
import { listMyGuideAssignments } from '../../services/assignmentService';
// 2. ดึงข้อมูลยอดคนจองจาก M3 ของเพื่อน
import { getBookedParticipantCount } from '../../services/bookingService';

export default function GuideDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAssignments = async () => {
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      // ดึงงานทั้งหมดที่ถูกมอบหมายให้ไกด์คนนี้ (ระบบจะรู้ ID ไกด์เองจากการล็อกอิน)
      const res = await listMyGuideAssignments();
      
      if (res.success) {
        // นำตารางงานแต่ละอัน ไปถาม M3 ว่า "รอบนี้มีคนจองกี่คนแล้ว?"
        const assignmentsWithCount = await Promise.all(
          res.data.map(async (task) => {
            const countRes = await getBookedParticipantCount(task.schedule_id);
            // ถ้าดึงสำเร็จให้เอาตัวเลขมาใช้ ถ้าดึงไม่สำเร็จให้เป็น 0
            const bookedCount = countRes.success ? countRes.data : 0;
            
            // นำยอดคนจองไปรวมกับข้อมูลตารางงานเดิม
            return { ...task, bookedCount };
          })
        );
        
        setAssignments(assignmentsWithCount);
      } else {
        setErrorMsg(res.error.message);
      }
    } catch (error) {
      setErrorMsg('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleUpdateAssignmentStatus = async (assignmentId, newStatus) => {
    // ในอนาคตสามารถใส่โค้ดอัปเดตสถานะใน DB (เช่น ACCEPTED, DECLINED) ได้ที่นี่
    // ตอนนี้เราจะอัปเดตแค่บนหน้าจอก่อนเพื่อให้เห็นภาพ
    setAssignments(prev => 
      prev.map(task => task.id === assignmentId ? { ...task, status: newStatus } : task)
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      'ASSIGNED': <span className="bg-[#F59E0B] text-white px-3 py-1 rounded-full text-xs font-medium">รอการตอบรับ</span>,
      'ACCEPTED': <span className="bg-[#16A34A] text-white px-3 py-1 rounded-full text-xs font-medium">ยืนยันรับงานแล้ว</span>,
      'DECLINED': <span className="bg-[#DC2626] text-white px-3 py-1 rounded-full text-xs font-medium">ปฏิเสธงาน</span>,
      'COMPLETED': <span className="bg-[#64748B] text-white px-3 py-1 rounded-full text-xs font-medium">เสร็จสิ้น</span>
    };
    return badges[status] || null;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1E293B]">Guide Dashboard</h1>
          <p className="text-[#64748B] text-sm mt-1">ตรวจสอบและจัดการตารางนำเที่ยวของคุณได้ที่นี่</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-[#DC2626]/10 border border-[#DC2626] rounded-[10px] text-[#DC2626] text-sm">{errorMsg}</div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#1E293B] mb-4">ตารางงานของคุณ</h2>
          
          {isLoading ? (
            <div className="text-center py-10 text-[#64748B]">กำลังโหลดข้อมูล...</div>
          ) : assignments.length === 0 ? (
            <div className="bg-[#FFFFFF] p-8 rounded-[12px] border border-[#E2E8F0] text-center text-[#64748B] shadow-sm">คุณยังไม่มีตารางนำเที่ยวที่ได้รับมอบหมาย</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {assignments.map((assignment) => {
                // เช็กว่าทัวร์เต็มความจุหรือยัง
                const isFull = assignment.bookedCount >= assignment.tour_schedules.max_participants;
                
                return (
                  <div key={assignment.id} className="bg-[#FFFFFF] p-6 rounded-[12px] border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      {getStatusBadge(assignment.status)}
                      <span className="text-[#7B5AA6] font-medium text-sm">{assignment.tour_schedules.tour_date}</span>
                    </div>

                    <h3 className="text-xl font-bold text-[#1E293B] mb-2">{assignment.tour_schedules.routes?.name}</h3>
                    
                    <div className="space-y-2 text-[#64748B] text-sm mb-6">
                      <p>เวลา: {assignment.tour_schedules.start_time} - {assignment.tour_schedules.end_time}</p>
                      <p className={`font-medium ${isFull ? 'text-[#DC2626]' : 'text-[#1E293B]'}`}>
                        ผู้เข้าร่วม: {assignment.bookedCount} / {assignment.tour_schedules.max_participants} ท่าน
                        {isFull && <span className="text-xs bg-[#DC2626] text-white px-2 py-0.5 rounded-full ml-2">เต็มแล้ว</span>}
                      </p>
                    </div>

                    {assignment.status === 'ASSIGNED' && (
                      <div className="flex gap-3 mt-4 pt-4 border-t border-[#E2E8F0]">
                        <button onClick={() => handleUpdateAssignmentStatus(assignment.id, 'ACCEPTED')} className="flex-1 bg-[#7B5AA6] hover:bg-[#684b8f] text-white py-2 rounded-[10px] font-medium transition-colors">รับงานนี้</button>
                        <button onClick={() => handleUpdateAssignmentStatus(assignment.id, 'DECLINED')} className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#E2E8F0] text-[#64748B] py-2 rounded-[10px] font-medium transition-colors">ปฏิเสธ</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}