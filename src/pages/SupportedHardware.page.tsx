import React, { useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBatteryCharging,
  IconCheck,
  IconCpu,
  IconDeviceGamepad,
  IconDeviceGamepad2,
  IconDevices,
  IconFlame,
  IconInfoCircle,
  IconLamp,
  IconPlug,
  IconSearch,
  IconTopologyStarRing3,
} from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';

export type HardwareCategory =
  | 'all'
  | 'mcu'
  | 'usb_host'
  | 'peripherals'
  | 'sensors'
  | 'expansion'
  | 'lighting'
  | 'bus'
  | 'power';

// Display text for each item lives in the translation file under supportedHardware.items.<id>
interface HardwareItem {
  id: string;
  category: HardwareCategory;
  badgeColor: string;
  guideLink?: string;
}

interface HardwareText {
  name: string;
  interfaceType: string;
  badge: string;
  description: string;
  details: string[];
  guideLabel?: string;
}

const HARDWARE_CATALOG: HardwareItem[] = [
  {
    id: 'pico_rp2040',
    category: 'mcu',
    badgeColor: 'teal',
    guideLink: '/guides/direct-pico-guitar',
  },
  { id: 'pico2_rp2350', category: 'mcu', badgeColor: 'blue' },
  { id: 'pico_w_wireless', category: 'mcu', badgeColor: 'violet' },
  { id: 'rp2040_derivatives', category: 'mcu', badgeColor: 'cyan' },
  { id: 'mcu_legacy_promicro', category: 'mcu', badgeColor: 'orange' },
  { id: 'mcu_legacy_uno_mega', category: 'mcu', badgeColor: 'orange' },
  { id: 'bt_csr8510', category: 'usb_host', badgeColor: 'teal' },
  { id: 'bt_broadcom_bcm', category: 'usb_host', badgeColor: 'indigo' },
  { id: 'usb_ps_controllers', category: 'usb_host', badgeColor: 'blue' },
  { id: 'usb_ps3_instruments', category: 'usb_host', badgeColor: 'teal' },
  { id: 'usb_modern_guitars', category: 'usb_host', badgeColor: 'teal' },
  { id: 'usb_x360_wired', category: 'usb_host', badgeColor: 'green' },
  { id: 'usb_x360_wireless_receiver', category: 'usb_host', badgeColor: 'green' },
  { id: 'usb_xone_series', category: 'usb_host', badgeColor: 'green' },
  { id: 'usb_xone_wireless_adapter', category: 'usb_host', badgeColor: 'green' },
  { id: 'usb_nintendo_devices', category: 'usb_host', badgeColor: 'red' },
  { id: 'rhythm_dance_pads', category: 'usb_host', badgeColor: 'orange' },
  { id: 'rhythm_bemanistyle', category: 'usb_host', badgeColor: 'orange' },
  { id: 'usb_streamdeck', category: 'usb_host', badgeColor: 'grape' },
  { id: 'usb_generic_hid', category: 'usb_host', badgeColor: 'gray' },
  {
    id: 'auth_security_dongles',
    category: 'usb_host',
    badgeColor: 'dark',
    guideLink: '/compatibility',
  },
  { id: 'auth_xone_harvested', category: 'bus', badgeColor: 'green', guideLink: '/compatibility' },
  {
    id: 'switches_mechanical',
    category: 'sensors',
    badgeColor: 'teal',
    guideLink: '/guides/direct-pico-guitar',
  },
  { id: 'analog_whammy_joystick', category: 'sensors', badgeColor: 'blue' },
  { id: 'sensors_tilt_imu', category: 'sensors', badgeColor: 'violet' },
  { id: 'periph_gh5_neck', category: 'peripherals', badgeColor: 'red' },
  { id: 'periph_crkd_neck', category: 'peripherals', badgeColor: 'teal' },
  { id: 'periph_protar_neck', category: 'peripherals', badgeColor: 'blue' },
  { id: 'periph_crazy_guitar', category: 'peripherals', badgeColor: 'grape' },
  { id: 'periph_wt_drum', category: 'peripherals', badgeColor: 'orange' },
  { id: 'periph_bh_drum', category: 'peripherals', badgeColor: 'orange' },
  { id: 'periph_crkd_drum', category: 'peripherals', badgeColor: 'teal' },
  { id: 'periph_djh_turntable', category: 'peripherals', badgeColor: 'violet' },
  { id: 'periph_infinium_fader', category: 'peripherals', badgeColor: 'cyan' },
  { id: 'periph_vtech_guitar', category: 'peripherals', badgeColor: 'yellow' },
  {
    id: 'periph_secondary_pico',
    category: 'peripherals',
    badgeColor: 'teal',
    guideLink: '/guides/direct-pico-guitar',
  },
  {
    id: 'exp_mpr121',
    category: 'expansion',
    badgeColor: 'pink',
    guideLink: '/guides/direct-pico-guitar',
  },
  { id: 'exp_multiplexer', category: 'expansion', badgeColor: 'indigo' },
  { id: 'exp_matrix_switch_network', category: 'expansion', badgeColor: 'blue' },
  { id: 'exp_ads1115', category: 'expansion', badgeColor: 'cyan' },
  { id: 'exp_rotary_encoder', category: 'expansion', badgeColor: 'teal' },
  { id: 'led_addressable_rgb', category: 'lighting', badgeColor: 'pink' },
  { id: 'led_apa102', category: 'lighting', badgeColor: 'pink' },
  { id: 'led_stp16cpc', category: 'lighting', badgeColor: 'yellow' },
  { id: 'led_dmx512', category: 'lighting', badgeColor: 'violet' },
  { id: 'led_discrete', category: 'lighting', badgeColor: 'yellow' },
  { id: 'pwr_max1704x', category: 'power', badgeColor: 'teal' },
  { id: 'pwr_adc_battery', category: 'power', badgeColor: 'blue' },
  { id: 'pwr_management_sleep', category: 'power', badgeColor: 'teal' },
  { id: 'bus_wii_extension', category: 'bus', badgeColor: 'red', guideLink: '/guides/wii-adapter' },
  { id: 'bus_wii_emulation', category: 'bus', badgeColor: 'red' },
  {
    id: 'bus_ps2_controller',
    category: 'bus',
    badgeColor: 'indigo',
    guideLink: '/guides/ps2-adapter',
  },
  { id: 'bus_ps2_emulation', category: 'bus', badgeColor: 'indigo' },
  { id: 'bus_snes_pad', category: 'bus', badgeColor: 'red' },
  { id: 'bus_joybus', category: 'bus', badgeColor: 'purple' },
  { id: 'bus_joybus_emulation', category: 'bus', badgeColor: 'purple' },
  { id: 'bus_xbox360_rf', category: 'bus', badgeColor: 'green' },
  { id: 'bus_midi', category: 'bus', badgeColor: 'grape' },
];

export function SupportedHardwarePage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HardwareCategory>('all');

  const catalog = useMemo(
    () =>
      HARDWARE_CATALOG.map((item) => ({
        ...item,
        ...(t(`supportedHardware.items.${item.id}`, { returnObjects: true }) as HardwareText),
      })),
    [t]
  );

  const filteredHardware = useMemo(() => {
    return catalog.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.interfaceType.toLowerCase().includes(q) ||
        item.details.some((d) => d.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [catalog, selectedCategory, search]);

  return (
    <Layout>
      <Container size="xl" px="md" pb="xl">
        {/* Page Header */}
        <Stack gap="xs" mb="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Title order={1} size="h2" fw={700}>
                {t('supportedHardware.title')}
              </Title>
              <Text size="sm" c="dimmed">
                {t('supportedHardware.subtitle')}
              </Text>
            </div>

            <Group gap="xs">
              <Button
                variant="light"
                size="xs"
                color="blue"
                component={Link}
                to="/compatibility"
                leftSection={<IconDeviceGamepad size={14} />}
              >
                {t('nav.compatibility')}
              </Button>
              <Button
                variant="subtle"
                size="xs"
                component={Link}
                to="/guides"
                leftSection={<IconPlug size={14} />}
              >
                {t('guides.catalogTitle')}
              </Button>
            </Group>
          </Group>
        </Stack>

        {/* Quick Highlights Alert */}
        <Alert
          icon={<IconInfoCircle size={18} />}
          title={t('supportedHardware.alertTitle')}
          color="blue"
          radius="md"
          mb="sm"
        >
          <Text size="xs">{t('supportedHardware.alertBody')}</Text>
        </Alert>

        {/* Clone Warning Alert */}
        <Alert
          icon={<IconAlertTriangle size={18} />}
          title={t('supportedHardware.cloneWarningTitle')}
          color="red"
          radius="md"
          mb="lg"
        >
          <Text size="xs">
            <Trans i18nKey="supportedHardware.cloneWarningBody" />
          </Text>
        </Alert>

        {/* Filter and Search */}
        <Group justify="space-between" align="center" mb="lg" gap="sm">
          <SegmentedControl
            size="xs"
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val as HardwareCategory)}
            data={[
              { label: t('supportedHardware.catAll'), value: 'all' },
              { label: t('supportedHardware.catMcu'), value: 'mcu' },
              { label: t('supportedHardware.catUsb'), value: 'usb_host' },
              {
                label: t('supportedHardware.catPeriph'),
                value: 'peripherals',
              },
              { label: t('supportedHardware.catSensors'), value: 'sensors' },
              {
                label: t('supportedHardware.catExpansion'),
                value: 'expansion',
              },
              { label: t('supportedHardware.catLighting'), value: 'lighting' },
              { label: t('supportedHardware.catBus'), value: 'bus' },
              { label: t('supportedHardware.catPower'), value: 'power' },
            ]}
            style={{ overflowX: 'auto', maxWidth: '100%' }}
          />

          <TextInput
            size="xs"
            placeholder={t('supportedHardware.searchPlaceholder')}
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ width: 220 }}
          />
        </Group>

        {/* Hardware Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filteredHardware.map((item) => (
            <Card
              key={item.id}
              withBorder
              radius="md"
              p="md"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Stack gap="xs">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                    <ThemeIcon
                      variant="light"
                      color={item.badgeColor}
                      size="md"
                      radius="md"
                      style={{ flexShrink: 0 }}
                    >
                      {item.category === 'mcu' && <IconCpu size={16} />}
                      {item.category === 'usb_host' && <IconPlug size={16} />}
                      {item.category === 'peripherals' && <IconFlame size={16} />}
                      {item.category === 'sensors' && <IconTopologyStarRing3 size={16} />}
                      {item.category === 'expansion' && <IconDevices size={16} />}
                      {item.category === 'lighting' && <IconLamp size={16} />}
                      {item.category === 'bus' && <IconDeviceGamepad2 size={16} />}
                      {item.category === 'power' && <IconBatteryCharging size={16} />}
                    </ThemeIcon>
                    <div style={{ minWidth: 0 }}>
                      <Title order={3} size="h5" fw={600} lineClamp={1}>
                        {item.name}
                      </Title>
                      <Text size="xs" c="dimmed">
                        {item.interfaceType}
                      </Text>
                    </div>
                  </Group>

                  <Badge
                    variant="light"
                    color={item.badgeColor}
                    size="xs"
                    style={{ flexShrink: 0 }}
                  >
                    {item.badge}
                  </Badge>
                </Group>

                <Text size="xs" c="dimmed" mt={4}>
                  {item.description}
                </Text>

                <Stack gap={4} mt={6}>
                  {item.details.map((detail, idx) => (
                    <Group key={idx} gap={6} align="flex-start" wrap="nowrap">
                      <ThemeIcon variant="transparent" color={item.badgeColor} size="xs" mt={2}>
                        <IconCheck size={12} stroke={2.5} />
                      </ThemeIcon>
                      <Text size="xs" style={{ flex: 1 }}>
                        {detail}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Stack>

              {item.guideLink && (
                <Group
                  justify="flex-end"
                  mt="md"
                  pt="sm"
                  style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                >
                  <Button
                    size="xs"
                    variant="subtle"
                    color="blue"
                    rightSection={<IconArrowRight size={14} />}
                    component={Link}
                    to={item.guideLink}
                    px={6}
                  >
                    {item.guideLabel ?? t('supportedHardware.openGuide')}
                  </Button>
                </Group>
              )}
            </Card>
          ))}
        </SimpleGrid>

        {filteredHardware.length === 0 && (
          <Card withBorder radius="md" p="xl" ta="center">
            <Text c="dimmed" size="sm">
              {t('supportedHardware.noneFound', { query: search })}
            </Text>
          </Card>
        )}
      </Container>
    </Layout>
  );
}
