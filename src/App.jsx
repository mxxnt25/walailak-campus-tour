import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import PublicLayout from './layouts/PublicLayout'

function Placeholder({ name }) {
  return <div className="p-6 text-textPrimary">หน้า: {name}</div>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <PublicLayout>
          <Routes>
            <Route path="/" element={<Placeholder name="Home" />} />
            <Route path="/login" element={<Placeholder name="Login" />} />
            <Route path="/register" element={<Placeholder name="Register" />} />
            <Route path="/profile" element={<Placeholder name="Profile" />} />
            <Route path="/admin/users" element={<Placeholder name="Admin Users" />} />
          </Routes>
        </PublicLayout>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App