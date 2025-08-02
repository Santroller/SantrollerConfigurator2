import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { useColorScheme } from '@mantine/hooks';
import { Router } from './Router';
import { theme } from './theme';

export default function App() {
  const preferredColorScheme = useColorScheme();
  return (
    <MantineProvider forceColorScheme={preferredColorScheme}>
      <Router />
    </MantineProvider>
  );
}
