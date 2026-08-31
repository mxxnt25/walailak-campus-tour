import React, { useState, useEffect } from 'react';
// import { listMyGuideAssignments } from '../../services/assignmentService';

export default function GuideDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const mockAssignments = [
    {
      id: 'asg-001',
      schedule_id: 'sch-001',
      status: 'ASSIGNED',
      bookedCount: 0,
      tour_schedules: {
        tour_date: '2026-09-10',
        start_time: '09:00',
        end_time: '11:00',
        max_participants: 20,
        status: 'OPEN',
        routes: { name: 'Main Campus Tour' }
      }
    },
    {
      id: 'asg-002',
      schedule_id: 'sch-002',
      status: 'ACCEPTED',
      bookedCount: 15,
      tour_schedules: {
        tour_date: '2026-09-15',
        start_time: '13:00',
        end_time: '15:00',
        max_participants: 15,
        status: 'OPEN',
        routes: { name: 'Botanic Garden Walk' }
      }
    }
  ];

  const fetchAssignments = async () => {
    setIsLoading(true);
    setErrorMsg('');
    
    // const { success, data, error } = await listMyGuideAssignments();
    // if (success) setAssignments(data); // อย่าลืมใส่ Logic ดึง BookedCount เพิ่มตอนเชื่อม API
    // else setErrorMsg(error.message);

    setTimeout(() => {
      setAssignments(mockAssignments);
      setIsLoading(false);
    }, 500);
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleUpdateAssignmentStatus = async (assignmentId, newStatus) => {
    // ใส่โค้ดอัพเดทฐานข้อมูลที่นี่เมื่อต่อ API
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