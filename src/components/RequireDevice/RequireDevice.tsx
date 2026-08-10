import { Navigate} from 'react-router-dom';
import { useConfigStore } from '../SettingsContext/SettingsContext';

export function RequireDevice({ children }: { children: React.ReactNode }) {
  const connected = useConfigStore((state) => state.connected);
  if (!connected) {
    return <Navigate to="/" />;
  }
  return children;
}
