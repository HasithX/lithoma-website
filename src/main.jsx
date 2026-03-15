import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Shop from './pages/Shop'
import Admin from './pages/Admin'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Shop />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/*" element={<Admin />} />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
)
