import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MapPage from './pages/MapPage'
import Drones from './pages/Drones'
import Prediction from './pages/Prediction'
import Alerts from './pages/Alerts'
import Photogrammetry from './pages/Photogrammetry'
import Stakeholders from './pages/Stakeholders'
import Resources from './pages/Resources'
import Settings from './pages/Settings'
import { useAegisStore } from './store'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAegisStore(s => s.isAuthenticated)
    if (!isAuthenticated) return <Navigate to="/login" replace />
    return <>{children}</>
}

export default function App() {
    const initializeData = useAegisStore(s => s.initializeData)

    useEffect(() => {
        initializeData()
    }, [initializeData])

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/map" element={<MapPage />} />
                    <Route path="/drones" element={<Drones />} />
                    <Route path="/analytics" element={<Prediction />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/photogrammetry" element={<Photogrammetry />} />
                    <Route path="/stakeholders" element={<Stakeholders />} />
                    <Route path="/resources" element={<Resources />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
