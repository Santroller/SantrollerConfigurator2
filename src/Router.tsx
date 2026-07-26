import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ConnectPage } from './pages/Connect.page';
import { DevicesPage } from './pages/Devices.page';
import { InputsPage } from './pages/Inputs.page';
import { DebugPage } from './pages/Debug.page';
import { LabelsPage } from './pages/Labels.page';

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
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
