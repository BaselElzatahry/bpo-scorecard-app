import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useParams } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/AppLayout';
import { SummaryScorecard } from './components/SummaryScorecard';
import { AuditPage } from './components/AuditPage';
import { AuditDetailsPage } from './components/AuditDetailsPage';
import { ConfigPanel } from './components/ConfigPanel';
import { LoginPage } from './components/LoginPage';
import { UserManagement } from './components/UserManagement';
import { ScoreSimulator } from './components/ScoreSimulator';
import { StatisticsPage } from './components/StatisticsPage';
import { AppealsPage } from './components/AppealsPage';
import { ReportsPage } from './components/ReportsPage';
import { NewAuditPage } from './components/NewAuditPage';

const ProtectedRoute = ({ children, requireAdmin }: { children: React.ReactNode, requireAdmin?: boolean }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (requireAdmin && user.role !== 'admin') return <Navigate to="/" replace />;
    return <>{children}</>;
};

const AuditPageWrapper: React.FC = () => {
    const { categoryId } = useParams<{ categoryId: string }>();
    if (!categoryId) return null;
    return <AuditPage key={categoryId} />;
};

const App: React.FC = () => {
    const router = createBrowserRouter([
        {
            path: "/login",
            element: <LoginPage />
        },
        {
            path: "/",
            element: (
                <ProtectedRoute>
                    <AppLayout />
                </ProtectedRoute>
            ),
            children: [
                {
                    index: true,
                    element: <SummaryScorecard />
                },
                {
                    path: "statistics",
                    element: <StatisticsPage />
                },
                {
                    path: "comparison",
                    element: <Navigate to="/statistics?tab=vendor-comparison" replace />
                },
                {
                    path: "trends",
                    element: <Navigate to="/statistics?tab=monthly-trends" replace />
                },
                {
                    path: "simulator",
                    element: <ScoreSimulator />
                },
                {
                    path: "reports",
                    element: <ReportsPage />
                },
                {
                    path: "new-audit",
                    element: <NewAuditPage />
                },
                {
                    path: "audits/details/:vendorId/:period",
                    element: <AuditDetailsPage />
                },
                {
                    path: "appeals",
                    element: <AppealsPage />
                },
                {
                    path: "audit/:categoryId",
                    element: <AuditPageWrapper />
                },
                {
                    path: "config",
                    element: (
                        <ProtectedRoute requireAdmin>
                            <ConfigPanel />
                        </ProtectedRoute>
                    )
                },
                {
                    path: "users",
                    element: (
                        <ProtectedRoute requireAdmin>
                            <UserManagement />
                        </ProtectedRoute>
                    )
                },
                {
                    path: "*",
                    element: <Navigate to="/" replace />
                }
            ]
        }
    ]);

    return (
        <AuthProvider>
            <ToastProvider>
                <AppProvider>
                    <RouterProvider router={router} />
                </AppProvider>
            </ToastProvider>
        </AuthProvider>
    );
};

export default App;
