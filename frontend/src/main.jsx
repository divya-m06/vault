import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { RequireAuth } from './components/auth/RequireAuth.jsx'
import { RequireVault } from './components/auth/RequireVault.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'
import { UnlockPage } from './pages/UnlockPage.jsx'
import VaultShell from './App.jsx'

/**
 * Route structure:
 *
 *   /login      — public, account login (Step 1: email + account password → JWT)
 *   /register   — public, account creation
 *   /unlock     — requires JWT (Step 2: master password → vault session)
 *   /vault      — requires JWT + active vault session
 *   /           → redirects to /login
 *   *           → redirects to /login
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes — no auth required */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Step 2: master password entry — requires JWT but not yet an open vault */}
          <Route
            path="/unlock"
            element={
              <RequireAuth>
                <UnlockPage />
              </RequireAuth>
            }
          />

          {/* Protected vault — requires JWT + unlocked vault session */}
          <Route
            path="/vault"
            element={
              <RequireAuth>
                <RequireVault>
                  <VaultShell />
                </RequireVault>
              </RequireAuth>
            }
          />

          {/* Fallback: send everyone to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
