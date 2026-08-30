import React, { useState, useEffect } from 'react';
// import { listOpenSchedules, createSchedule } from '../../services/scheduleService';
// import { assignGuide } from '../../services/assignmentService';

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const mockRoutes = [{ id: 'rt-1', name: 'Main Campus Tour' }];
  const mockGuides = [{ id: 'guide-1', full_name: 'สมชาย นำเที่ยว' }];

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const [scheduleForm, setScheduleForm] = useState({
    route_id: '',
    tour_date: '',
    start_time: '',
    end_time: '',
    max_participants: 1
  });
  const [selectedGuideId, setSelectedGuideId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSchedules = async () => {
    setIsLoading(true);
    setErrorMsg('');
    
    // const { success, data, error } = await listOpenSchedules();
    // if (success) setSchedules(data);
    // else setErrorMsg(error.message);
    
    setTimeout(() => {
      setSchedules([]);
      setIsLoading(false);
    }, 500);
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCreateSchedule = async () => {
    setErrorMsg('');
    setIsSubmitting(true);

    if (!scheduleForm.route_id || !scheduleForm.tour_date || !scheduleForm.start_time || scheduleForm.max_participants < 1) {
      setErrorMsg('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนและถูกต้อง');
      setIsSubmitting(false);
      return;
    }

    // const { success, error } = await createSchedule(scheduleForm);
    // if (success) { setIsScheduleModalOpen(false); fetchSchedules(); }
    // else setErrorMsg(error.message);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsScheduleModalOpen(false);
      fetchSchedules();
    }, 500);
  };

  const handleAssignGuide = async () => {
    if (!selectedGuideId || !selectedSchedule) return;
    
    setErrorMsg('');
    setIsSubmitting(true);

    // const { success, error } = await assignGuide({ scheduleId: selectedSchedule.id, guideId: selectedGuideId });
    // if (success) { setIsAssignModalOpen(false); fetchSchedules(); }
    // else setErrorMsg(error.message);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsAssignModalOpen(false);
      fetchSchedules();
    }, 500);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'OPEN': <span className="bg-[#16A34A] text-white px-3 py-1 rounded-full text-xs font-medium">OPEN</span>,
      'FULL': <span className="bg-[#F59E0B] text-white px-3 py-1 rounded-full text-xs font-medium">FULL</span>,
      'CANCELLED': <span className="bg-[#DC2626] text-white px-3 py-1 rounded-full text-xs font-medium">CANCELLED</span>,
      'COMPLETED': <span className="bg-[#64748B] text-white px-3 py-1 rounded-full text-xs font-medium">COMPLETED</span>,
    };
    return badges[status] || null;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Tour Schedules</h1>
            <p className="text-[#64748B] text-sm mt-1">จัดการรอบนำเที่ยวและตารางงาน</p>
          </div>
          <button 
            onClick={() => {
              setScheduleForm({ route_id: '', tour_date: '', start_time: '', end_time: '', max_participants: 1 });
              setIsScheduleModalOpen(true);
            }}
            className="bg-[#7B5AA6] hover:bg-[#684b8f] text-white px-5 py-2.5 rounded-[10px] font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            + สร้างรอบนำเที่ยว
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-4 bg-[#DC2626]/10 border border-[#DC2626] rounded-[10px] text-[#DC2626] text-sm">
            {errorMsg}
          </div>
        )}

        <div className="bg-[#FFFFFF] rounded-[12px] border border-[#E2E8F0] shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Date & Time</th>
                  <th className="px-6 py-4 font-medium">Route</th>
                  <th className="px-6 py-4 font-medium">Capacity</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Guide</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {isLoading ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-[#64748B]">กำลังโหลดข้อมูล...</td></tr>
                ) : schedules.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-[#64748B]">ไม่มีข้อมูลรอบนำเที่ยว</td></tr>
                ) : (
                  schedules.map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-[#1E293B] font-medium">{schedule.tour_date}</div>
                        <div className="text-[#64748B] text-sm">{schedule.start_time} - {schedule.end_time}</div>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B]">{schedule.routes?.name}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{schedule.max_participants} pax</td>
                      <td className="px-6 py-4">{getStatusBadge(schedule.status)}</td>
                      <td className="px-6 py-4">
                        {schedule.guide_assignments ? (
                          <button 
                            onClick={() => {
                              setSelectedSchedule(schedule);
                              setSelectedGuideId(schedule.guide_assignments.guide_id);
                              setIsAssignModalOpen(true);
                            }}
                            className="text-[#16A34A] text-sm font-medium hover:underline flex items-center gap-1"
                          >
                            Assigned (เปลี่ยน)
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              setSelectedSchedule(schedule);
                              setSelectedGuideId('');
                              setIsAssignModalOpen(true);
                            }}
                            className="text-[#F37321] text-sm font-medium hover:underline"
                          >
                            + Assign Guide
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal 1: สร้างรอบนำเที่ยว */}
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-[#FFFFFF] rounded-[12px] shadow-xl w-full max-w-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#1E293B]">สร้างรอบนำเที่ยวใหม่</h2>
                <button onClick={() => setIsScheduleModalOpen(false)} className="text-[#64748B] hover:text-[#1E293B]">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1">เส้นทาง (Route)</label>
                  <select 
                    value={scheduleForm.route_id}
                    onChange={(e) => setScheduleForm({...scheduleForm, route_id: e.target.value})}
                    className="w-full border border-[#E2E8F0] rounded-[10px] p-2.5 text-[#1E293B] focus:outline-none focus:border-[#7B5AA6]"
                  >
                    <option value="">เลือกเส้นทาง...</option>
                    {mockRoutes.map(route => <option key={route.id} value={route.id}>{route.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1">วันที่ (Tour Date)</label>
                  <input 
                    type="date" 
                    value={scheduleForm.tour_date}
                    onChange={(e) => setScheduleForm({...scheduleForm, tour_date: e.target.value})}
                    className="w-full border border-[#E2E8F0] rounded-[10px] p-2.5 text-[#1E293B] focus:outline-none focus:border-[#7B5AA6]" 
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#1E293B] mb-1">เวลาเริ่ม</label>
                    <input 
                      type="time" 
                      value={scheduleForm.start_time}
                      onChange={(e) => setScheduleForm({...scheduleForm, start_time: e.target.value})}
                      className="w-full border border-[#E2E8F0] rounded-[10px] p-2.5 text-[#1E293B] focus:outline-none focus:border-[#7B5AA6]" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#1E293B] mb-1">เวลาสิ้นสุด</label>
                    <input 
                      type="time" 
                      value={scheduleForm.end_time}
                      onChange={(e) => setScheduleForm({...scheduleForm, end_time: e.target.value})}
                      className="w-full border border-[#E2E8F0] rounded-[10px] p-2.5 text-[#1E293B] focus:outline-none focus:border-[#7B5AA6]" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1">ความจุสูงสุด (Max Participants)</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={scheduleForm.max_participants}
                    onChange={(e) => setScheduleForm({...scheduleForm, max_participants: parseInt(e.target.value) || 1})}
                    placeholder="เช่น 20" 
                    className="w-full border border-[#E2E8F0] rounded-[10px] p-2.5 text-[#1E293B] focus:outline-none focus:border-[#7B5AA6]" 
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end gap-3">
                <button onClick={() => setIsScheduleModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 rounded-[10px] text-[#64748B] font-medium hover:bg-[#E2E8F0] transition-colors">ยกเลิก</button>
                <button onClick={handleCreateSchedule} disabled={isSubmitting} className="px-4 py-2 rounded-[10px] bg-[#7B5AA6] text-white font-medium hover:bg-[#684b8f] transition-colors">
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: มอบหมายไกด์ */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-[#FFFFFF] rounded-[12px] shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#1E293B]">มอบหมายผู้นำเที่ยว (Assign Guide)</h2>
                <button onClick={() => setIsAssignModalOpen(false)} className="text-[#64748B] hover:text-[#1E293B]">✕</button>
              </div>
              <div className="p-6">
                <p className="text-sm text-[#64748B] mb-4">
                  รอบทัวร์วันที่: <span className="text-[#1E293B] font-medium">{selectedSchedule?.tour_date}</span>
                </p>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">เลือกไกด์ (จากผู้ใช้ที่ยืนยัน Role แล้ว)</label>
                <select 
                  value={selectedGuideId}
                  onChange={(e) => setSelectedGuideId(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-[10px] p-2.5 text-[#1E293B] focus:outline-none focus:border-[#7B5AA6]"
                >
                  <option value="">เลือกผู้นำเที่ยว...</option>
                  {mockGuides.map(guide => (
                    <option key={guide.id} value={guide.id}>{guide.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end gap-3">
                <button onClick={() => setIsAssignModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 rounded-[10px] text-[#64748B] font-medium hover:bg-[#E2E8F0] transition-colors">ยกเลิก</button>
                <button onClick={handleAssignGuide} disabled={isSubmitting} className="px-4 py-2 rounded-[10px] bg-[#F37321] text-white font-medium hover:bg-[#d9631a] transition-colors">
                  {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการมอบหมาย'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}