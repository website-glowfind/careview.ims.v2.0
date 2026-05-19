import {Routes, Route} from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import ProtectedRoute from './middleware/ProtectedRoute'
import DashboardLayout from './components/layouts/Layout'
import Employees from './pages/Employees/Employees'
import { LoginPage } from './pages/Figma-UI/Login-page'
import { InventoryPage } from './pages/Inventory/InventoryPage'
import MainLayout from './pages/MainLayout'
function App() {

  return (
    <ProtectedRoute>
      <Routes>
          <Route path="/login" element= {<LoginPage />}/>
          <Route path="/" element=  {<MainLayout />}/>
          <Route path="/dashboard" element=  {<DashboardLayout><Dashboard /></DashboardLayout>}/>
          <Route path="/inventory" element=  {<DashboardLayout><InventoryPage /></DashboardLayout>}/>
          <Route path="/employees" element=  {<DashboardLayout><Employees /></DashboardLayout>}/>
      </Routes>
    </ProtectedRoute>
  )
}

export default App
