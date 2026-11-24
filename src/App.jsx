import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppDataProvider } from './app/AppDataProvider.jsx';
import { AppShell } from './app/AppShell.jsx';
import { CirclePage } from './features/circle/pages/CirclePage.jsx';
import { UserDetailPage } from './features/users/pages/UserDetailPage.jsx';
import { UsersPage } from './features/users/pages/UsersPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AppDataProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/users" replace />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:userId" element={<UserDetailPage />} />
            <Route path="circle" element={<CirclePage />} />
            <Route path="*" element={<Navigate to="/users" replace />} />
          </Route>
        </Routes>
      </AppDataProvider>
    </BrowserRouter>
  );
}
