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

// The real store reads localStorage when it loads
vi.hoisted(() => {
  const items = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
  });
});

function renderStep(id: string, nested = false) {
  const Step = INPUT_BEHAVIOR_GUIDE.steps.find((step) => step.id === id)!.render;
  const element = document.createElement('div');
  element.innerHTML = renderToStaticMarkup(
    <MemoryRouter>
      <MantineProvider>
        <Step nested={nested} />
      </MantineProvider>
    </MemoryRouter>
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
      // The real editors link to this guide inside the demo, which is fine
      const links = Array.from(element.querySelectorAll('a[target="_blank"]'));
      expect(links.filter((link) => !link.closest('[inert]'))).toHaveLength(0);
    }
  );

  it('leaves saving to the setup guide when nested', () => {
    const save = i18next.t('guides.input-behavior.save');
    expect(renderStep('held').textContent).toContain(save);
    expect(renderStep('held', true).textContent).not.toContain(save);
  });

  it('uses valid protobuf configurations with matching virtual device references', () => {
    const { cycling, toggle, held } = INPUT_BEHAVIOR_EXAMPLES;
    expect(proto.ProfileAssignmentInfo.verify(cycling.assignment)).toBeNull();
    const decodedRule = proto.ProfileAssignmentInfo.decode(
      proto.ProfileAssignmentInfo.encode(cycling.assignment).finish()
    );
    expect(decodedRule.inputAnyTime?.input).toMatchObject(cycling.assignment.inputAnyTime.input);
    for (const example of [toggle, held]) {
      expect(proto.Mapping.verify(example.mapping)).toBeNull();
      const decoded = proto.Mapping.decode(proto.Mapping.encode(example.mapping).finish());
      expect(decoded.input).toMatchObject(example.mapping.input);
      expect(decoded.mapping).toMatchObject(example.mapping.mapping);
    }
    for (const example of [cycling, toggle]) {
      expect(proto.Device.verify(example.device)).toBeNull();
    }
    expect(cycling.assignment.inputAnyTime.input.cycle.deviceid).toBe(cycling.device.deviceid);
    expect(toggle.mapping.input.toggle.deviceid).toBe(toggle.device.deviceid);
    expect(cycling.device.cycle.values).toEqual([0, 1, 2]);
    expect(cycling.device.cycle.values[cycling.state]).toBe(1);
    expect(held.mapping.input.held.time).toBe(1000);
  });

  it.each(['cycling', 'toggle', 'held'])('%s renders the real editors read-only', (kind) => {
    const element = renderStep(kind);
    expect(element.textContent).toContain('Configured example');
    expect(element.textContent).toContain('Read-only demo');
    expect(element.textContent).toContain('they do not read from or change your controller.');
    expect(element.querySelector('[inert]')).not.toBeNull();
    expect(element.textContent).toContain('GP2');
    expect(element.textContent).not.toContain('outputs.');
  });

  it('shows both cycling sources, the named slots and the active slot', () => {
    const element = renderStep('cycling');
    expect(element.textContent).toContain('GP3');
    expect(element.textContent).toContain('Number of slots');
    expect(element.textContent).toContain('Forward input');
    expect(element.textContent).toContain('Backward input');
    expect(element.textContent).toContain('Guitar Hero Guitar');
    expect(element.textContent).toContain('Rock Band Guitar');
    expect(element.textContent).toContain('Fortnite Festival');
    expect(element.textContent).toContain('Activation');
    expect(element.textContent).toContain('Active on');
  });

  it('shows the toggle device and its mapping', () => {
    const element = renderStep('toggle');
    expect(element.querySelectorAll('input[role="switch"]:checked').length).toBeGreaterThan(0);
  });

  it('shows a 1000 ms hold with no virtual device', () => {
    const element = renderStep('held');
    expect(Array.from(element.querySelectorAll('input')).map((input) => input.value)).toContain(
      '1000'
    );
    expect(element.textContent).toContain('No virtual device is needed');
  });
});
