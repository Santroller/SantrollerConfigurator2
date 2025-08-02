import { useReducer, useState } from 'react';
import {
  IconActivity,
  IconChevronRight,
  IconCircleOff,
  IconDeviceGamepad3,
  IconGauge,
  IconHome2,
  IconSettings,
} from '@tabler/icons-react';
import { Navigate, NavLink as RouterLink } from 'react-router-dom';
import { AppShell, Badge, Burger, Group, Image, NavLink, Skeleton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useConfigStore } from '../SettingsContext/SettingsContext';
import classes from './Layout.module.css';

export function RequireDevice({ children }) {
  const connected = useConfigStore((state) => state.connected);
  if (!connected) {
    return <Navigate to="/" />;
  }
  return children;
}
