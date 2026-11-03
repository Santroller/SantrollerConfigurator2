import i18next from 'i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';

import '@/i18n/config';

import { proto } from '@/components/SettingsContext/config';
import { extrasFor } from '../setup/setupPath';
import { INPUT_BEHAVIOR_GUIDE } from './inputBehaviorGuide';
import { INPUT_BEHAVIOR_EXAMPLES } from './InputBehaviorPreview';

vi.mock('@/components/SettingsContext/SettingsContext', () => ({
  useConfigStore: (selector: (state: { connected: boolean; updating: boolean }) => unknown) =>
    selector({ connected: false, updating: false }),
}));

function renderStep(id: string, nested = false) {
  const Step = INPUT_BEHAVIOR_GUIDE.steps.find((step) => step.id === id)!.render;
  const element = document.createElement('div');
  element.innerHTML = renderToStaticMarkup(
    <MantineProvider>
      <MemoryRouter>
        <Step nested={nested} />
      </MemoryRouter>
    </MantineProvider>
  );
  return element;
}

describe('input behavior guide', () => {
  it('is not offered as a hardware setup extra', () => {
    expect(extrasFor('direct-pico-guitar')).not.toContain(INPUT_BEHAVIOR_GUIDE.id);
    expect(extrasFor('bt-receiver')).not.toContain(INPUT_BEHAVIOR_GUIDE.id);
  });

  it.each(INPUT_BEHAVIOR_GUIDE.steps.map((step) => step.id))(
    '%s renders translated instructions and checks without a controller',
    (id) => {
      const key = `guides.input-behavior.steps.${id}`;
      for (const field of ['intro', 'example', 'note', 'instructions', 'checks']) {
        expect(i18next.exists(`${key}.${field}`)).toBe(true);
      }
      for (const field of ['instructions', 'checks']) {
        const items = i18next.t(`${key}.${field}`, { returnObjects: true });
        expect(Array.isArray(items)).toBe(true);
        if (Array.isArray(items)) {
          expect(items.length).toBeGreaterThan(0);
        }
      }
      const element = renderStep(id);
      expect(element.textContent).not.toContain('guides.input-behavior.');
      expect(element.querySelectorAll('ol li').length).toBeGreaterThan(0);
      expect(element.querySelectorAll('ul li').length).toBeGreaterThan(0);
      const links = Array.from(element.querySelectorAll('a'));
      expect(links.map((link) => link.getAttribute('href'))).toEqual(
        id === 'held' ? ['/profiles'] : ['/devices', '/profiles']
      );
      expect(links.every((link) => link.target === '_blank')).toBe(true);
    }
  );

  it('leaves saving to the setup guide when nested', () => {
    const save = i18next.t('guides.input-behavior.save');
    expect(renderStep('held').textContent).toContain(save);
    expect(renderStep('held', true).textContent).not.toContain(save);
  });

  it('uses valid protobuf configurations with matching virtual device references', () => {
    const { cycling, toggle, held } = INPUT_BEHAVIOR_EXAMPLES;
    for (const example of [cycling, toggle, held]) {
      expect(proto.Mapping.verify(example.mapping)).toBeNull();
      const decoded = proto.Mapping.decode(proto.Mapping.encode(example.mapping).finish());
      expect(decoded.input).toMatchObject(example.mapping.input);
      expect(decoded.mapping).toMatchObject(example.mapping.mapping);
    }
    for (const example of [cycling, toggle]) {
      expect(proto.Device.verify(example.device)).toBeNull();
    }
    expect(cycling.mapping.input.cycle.deviceid).toBe(cycling.device.deviceid);
    expect(toggle.mapping.input.toggle.deviceid).toBe(toggle.device.deviceid);
    expect(cycling.device.cycle.values).toEqual([0, 32768, 65535]);
    expect(cycling.device.cycle.values[cycling.state]).toBe(32768);
    expect(held.mapping.input.held.time).toBe(1000);
  });

  it.each(['cycling', 'toggle', 'held'])('%s shows a read-only configured mapping', (kind) => {
    const element = renderStep(kind);
    expect(element.textContent).toContain('Configured example');
    expect(element.textContent).toContain('Read-only demo');
    expect(element.textContent).toContain('Profiles - Input #1');
    expect(element.textContent).toContain('They do not read from or change your controller.');
    const inputs = Array.from(element.querySelectorAll('input')).filter(
      (input) => input.type !== 'hidden'
    );
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) {
      if (input.type === 'radio') {
        expect(
          element.querySelector(`label[for="${input.id}"]`)?.hasAttribute('data-read-only')
        ).toBe(true);
      } else {
        expect(input.readOnly).toBe(true);
      }
    }
    expect(inputs.map((input) => input.value)).toContain('GP2');
    expect(inputs.map((input) => input.value)).toContain('Pull Up');
    expect(inputs.map((input) => input.value)).toContain(
      kind === 'cycling' ? 'Right Stick X Axis' : 'A Button'
    );
    expect(element.textContent).not.toContain('outputs.');
  });

  it('shows both cycling sources, selected value, and custom values', () => {
    const element = renderStep('cycling');
    const inputs = Array.from(element.querySelectorAll('input'));
    expect(inputs.map((input) => input.value)).toContain('GP3');
    expect(inputs.map((input) => input.value)).toContain('Custom range');
    expect(element.textContent).toContain('Forward button - nested input');
    expect(element.textContent).toContain('Reverse button - nested input');
    const states = inputs.filter((input) => input.type === 'radio');
    expect(states.map((input) => input.value)).toEqual(['0', '1', '2']);
    expect(states.find((input) => input.checked)?.value).toBe('1');
    expect(element.querySelectorAll('input[role="switch"]:checked')).toHaveLength(2);
  });

  it('shows the same on state in the toggle device and mapping', () => {
    const element = renderStep('toggle');
    expect(element.querySelectorAll('input[role="switch"]:checked')).toHaveLength(2);
    expect(element.textContent?.match(/Toggle Input 2/g)).toHaveLength(1);
    expect(Array.from(element.querySelectorAll('input')).map((input) => input.value)).toContain(
      'Toggle Input 2'
    );
  });

  it('shows a 1000 ms hold with a nested source but no virtual device', () => {
    const element = renderStep('held');
    expect(Array.from(element.querySelectorAll('input')).map((input) => input.value)).toContain(
      '1000'
    );
    expect(element.textContent).toContain('Source button - nested input');
    expect(element.textContent).toContain('No virtual device is needed');
    expect(element.querySelector('input[role="switch"]')).toBeNull();
  });
});
