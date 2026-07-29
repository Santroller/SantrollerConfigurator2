import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ConnectPage } from './pages/Connect.page';
import { DevicesPage } from './pages/Devices.page';
import { InputsPage } from './pages/Inputs.page';
import { DebugPage } from './pages/Debug.page';
import { LabelsPage } from './pages/Labels.page';
import { CommercialToolPage } from './pages/Commercial';
import { SetupPage } from './pages/Setup.page';
import { AuthPage } from './pages/Auth.page';

const router = createBrowserRouter([
  {
    path: '/',
    element: <ConnectPage />,
  },{
    path: '/devices',
    element: <DevicesPage />,
  },{
    path: '/profiles',
    element: <InputsPage />,
  },{
    path: '/debug',
    element: <DebugPage />,
  },{
    path: '/labels',
    element: <LabelsPage />,
  },{
    path: '/setup',
    element: <SetupPage />,
  },{
    path: '/commercial-tool',
    element: <CommercialToolPage />,
  },{
    path: '/github-oauth-callback',
    element: <AuthPage />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
