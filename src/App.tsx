/**
 * Routes.
 *
 * Four screens, one per thing you actually do: see your clients, open one, edit
 * it, or change settings. Providers are nested so the store can raise toasts.
 */

import { Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './store/store';
import { ToastProvider } from './ui/Toast';
import { ClientListScreen } from './screens/ClientListScreen';
import { WorkspaceScreen } from './screens/WorkspaceScreen';
import { EditScreen } from './screens/EditScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <Routes>
          <Route path="/" element={<ClientListScreen />} />
          <Route path="/c/:id" element={<WorkspaceScreen />} />
          <Route path="/c/:id/edit" element={<EditScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StoreProvider>
    </ToastProvider>
  );
}
