// Isolated UI test harness; not linked from the app or included in production build.
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TourDetail from '../../../src/pages/guide/TourDetail';
import Schedules from '../../../src/pages/admin/Schedules';
import RouteEdit from '../../../src/pages/admin/RouteEdit';
import AdminRoutes from '../../../src/pages/admin/AdminRoutes';
import '../../../src/index.css';
const initial = new URLSearchParams(location.search).get('screen') || '/schedules';
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={[initial]}><main style={{ padding: 16 }}><Routes><Route path="/guide/tours/:scheduleId" element={<TourDetail/>}/><Route path="/schedules" element={<Schedules/>}/><Route path="/routes/:id" element={<RouteEdit/>}/><Route path="/routes" element={<AdminRoutes/>}/></Routes></main></MemoryRouter>);
