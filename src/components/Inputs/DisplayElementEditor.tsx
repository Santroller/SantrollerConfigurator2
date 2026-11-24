import { ReactNode, useEffect, useRef, useState } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Button,
  Card,
  FileButton,
  Group,
  NumberInput,
  Select,
  Space,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import {
  DEFAULT_FRAME_MS,
  displaySize,
  elementFrame,
  frameAt,
  frameCount,
  imageAspect,
  loadDisplayImage,
  loadDisplayImageAt,
  MAX_EXTRA_FRAMES,
  MAX_SCALE,
  MAX_TEXT_LENGTH,
  MIN_FRAME_MS,
  MonoFrame,
  proportionalSize,
  resizeDisplayImage,
  sanitiseDisplayText,
} from '@/components/Inputs/displayRender';
import { proto } from '@/components/SettingsContext/config';

const PREVIEW_SCALE = 3;

// A joystick axis that hasn't been picked yet
function newStickInput(): proto.IInput {
  return { gpio: { pin: -1, analog: true, pinMode: proto.PinMode.Floating } };
}

export function newDisplayElement(deviceId: number): proto.IDisplayLedDevice {
  return {
    deviceId,
    type: proto.DisplayElementType.DisplayElementText,
    x: 0,
    y: 0,
    scale: 1,
    text: 'Santroller',
  };
}

// The display with every element of this profile drawn on it, as if each was on. Bars are drawn half full.
// The current element can be dragged around it, or nudged with the arrow keys.
// While animations play, how long since they started
function useAnimationTime(playing: boolean) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!playing) {
      setMs(0);
      return undefined;
    }
    const start = performance.now();
    const timer = setInterval(() => setMs(performance.now() - start), MIN_FRAME_MS);
    return () => clearInterval(timer);
  }, [playing]);
  return ms;
}

function DisplayPreview({
  elements,
  width,
  height,
  element,
  shownFrame,
  onMove,
}: {
  elements: proto.IDisplayLedDevice[];
  width: number;
  height: number;
  // The element being edited, which is one of elements
  element: proto.IDisplayLedDevice;
  // The frame of it to show and move, or play to animate everything
  shownFrame: number | 'play';
  onMove: (x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playing = shownFrame === 'play' && elements.some((other) => frameCount(other) > 1);
  const ms = useAnimationTime(playing);
  // Other elements show their first frame while one frame of this one is picked
  const frameOf = (other: proto.IDisplayLedDevice) =>
    shownFrame === 'play' ? frameAt(other, ms) : other === element ? shownFrame : 0;
  // What's outlined and moved: the frame picked, or the element itself while playing
  const current = elementFrame(element, shownFrame === 'play' ? 0 : shownFrame);
  // Where in the element it was picked up, while it's being dragged
  const grab = useRef<{ x: number; y: number } | null>(null);
  const { t } = useTranslation();
  const size = elementSize(current);
  // The canvas is scaled to fit, so pointer positions are turned back into display pixels
  const toDisplay = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.floor(((event.clientX - rect.left) / rect.width) * width),
      y: Math.floor(((event.clientY - rect.top) / rect.height) * height),
    };
  };
  const inside = (point: { x: number; y: number }) =>
    point.x >= current.x &&
    point.y >= current.y &&
    point.x < current.x + size.width &&
    point.y < current.y + size.height;
  // Kept on the display, as far as it fits
  const moveTo = (x: number, y: number) => {
    const nx = Math.max(0, Math.min(Math.max(0, width - size.width), x));
    const ny = Math.max(0, Math.min(Math.max(0, height - size.height), y));
    if (nx !== current.x || ny !== current.y) {
      onMove(nx, ny);
    }
  };
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) {
      return;
    }
    const frame = new MonoFrame(width, height);
    for (const other of elements) {
      frame.drawElement(elementFrame(other, frameOf(other)), 32768);
    }
    context.fillStyle = '#000';
    context.fillRect(0, 0, width * PREVIEW_SCALE, height * PREVIEW_SCALE);
    context.fillStyle = '#7fd4ff';
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (frame.pixel(x, y)) {
          context.fillRect(x * PREVIEW_SCALE, y * PREVIEW_SCALE, PREVIEW_SCALE, PREVIEW_SCALE);
        }
      }
    }
    // Where this element is, outlined
    context.strokeStyle = '#ff9f43';
    context.lineWidth = 1;
    context.strokeRect(
      current.x * PREVIEW_SCALE + 0.5,
      current.y * PREVIEW_SCALE + 0.5,
      size.width * PREVIEW_SCALE - 1,
      size.height * PREVIEW_SCALE - 1
    );
  }, [elements, width, height, current, size.width, size.height, ms, shownFrame, element]);
  return (
    <>
      <Text size="sm" fw={500}>
        {t('display.preview')}
      </Text>
      <canvas
        ref={canvasRef}
        width={width * PREVIEW_SCALE}
        height={height * PREVIEW_SCALE}
        tabIndex={0}
        aria-label={t('display.preview_move')}
        style={{
          maxWidth: '100%',
          imageRendering: 'pixelated',
          borderRadius: 4,
          cursor: 'crosshair',
          touchAction: 'none',
        }}
        onPointerDown={(event) => {
          const point = toDisplay(event);
          // Picked up where it was grabbed, or by its corner when grabbed from somewhere else
          grab.current = inside(point)
            ? { x: point.x - current.x, y: point.y - current.y }
            : { x: 0, y: 0 };
          event.currentTarget.setPointerCapture?.(event.pointerId);
          moveTo(point.x - grab.current.x, point.y - grab.current.y);
        }}
        onPointerMove={(event) => {
          const point = toDisplay(event);
          if (grab.current) {
            moveTo(point.x - grab.current.x, point.y - grab.current.y);
          } else {
            event.currentTarget.style.cursor = inside(point) ? 'move' : 'crosshair';
          }
        }}
        onPointerUp={() => {
          grab.current = null;
        }}
        onPointerCancel={() => {
          grab.current = null;
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 8 : 1;
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          const move = moves[event.key];
          if (move) {
            event.preventDefault();
            moveTo(current.x + move[0], current.y + move[1]);
          }
        }}
      />
      <Text size="xs" c="dimmed">
        {t('display.preview_description')}
      </Text>
    </>
  );
}

// Just this element on its display, for the collapsed card
export function DisplayThumbnail({
  element,
  display,
}: {
  element: proto.IDisplayLedDevice;
  display: proto.IDisplayDevice;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useTranslation();
  const { width, height } = displaySize(display);
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) {
      return;
    }
    const frame = new MonoFrame(width, height);
    frame.drawElement(element, 32768);
    const image = context.createImageData(width, height);
    for (let i = 0; i < frame.pixels.length; i++) {
      const on = frame.pixels[i];
      image.data.set(on ? [0x7f, 0xd4, 0xff, 0xff] : [0, 0, 0, 0xff], i * 4);
    }
    context.putImageData(image, 0, 0);
  }, [element, width, height]);
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      role="img"
      aria-label={t('display.preview')}
      // One pixel per display pixel, shrinking it loses the 1 pixel strokes of the text
      style={{
        width,
        height,
        imageRendering: 'pixelated',
        borderRadius: 2,
        alignSelf: 'flex-start',
      }}
    />
  );
}

function elementSize(element: proto.IDisplayLedDevice) {
  if (element.type === proto.DisplayElementType.DisplayElementText) {
    const scale = Math.min(MAX_SCALE, Math.max(1, element.scale ?? 1));
    return { width: (element.text ?? '').length * 6 * scale, height: 8 * scale };
  }
  return { width: element.width ?? 0, height: element.height ?? 0 };
}

export function DisplayElementEditor({
  element,
  display,
  elements,
  dispatch,
  renderInput,
}: {
  element: proto.IDisplayLedDevice;
  // The display it's on, undefined while that device is missing
  display?: proto.IDisplayDevice | null;
  // Every element on that display in this profile, in order, including this one
  elements: proto.IDisplayLedDevice[];
  dispatch: (element: proto.IDisplayLedDevice) => void;
  // A picker for one of a joystick's axes
  renderInput?: (
    axis: 'x' | 'y',
    input: proto.IInput,
    dispatch: (input: proto.IInput) => void
  ) => ReactNode;
}) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);
  const [keepProportions, setKeepProportions] = useState(true);
  const [frameImageError, setFrameImageError] = useState<number | null>(null);
  // Which frame the preview shows and moves, or play to animate it
  const [pickedFrame, setPickedFrame] = useState<number | 'play'>('play');
  const { width, height } = displaySize(display);
  const update = (changes: Partial<proto.IDisplayLedDevice>) =>
    dispatch({ ...element, ...changes });
  const frames = element.frames ?? [];
  const shownFrame =
    frames.length === 0
      ? 0
      : pickedFrame !== 'play' && pickedFrame > frames.length
        ? 'play'
        : pickedFrame;
  const updateFrame = (i: number, changes: Partial<proto.IDisplayFrame>) =>
    update({ frames: frames.map((frame, j) => (j === i ? { ...frame, ...changes } : frame)) });
  // Frames' images stay the size of the element's own, so they go with it when that changes
  const withImage = (next: { image: Uint8Array; width: number; height: number }) => ({
    ...next,
    frames: frames.map((frame) =>
      frame.image?.length && element.width && element.height
        ? {
            ...frame,
            image: resizeDisplayImage(
              { image: frame.image, width: element.width, height: element.height },
              next.width,
              next.height
            ).image,
          }
        : frame
    ),
  });
  const isText = element.type === proto.DisplayElementType.DisplayElementText;
  const isImage = element.type === proto.DisplayElementType.DisplayElementImage;
  const isBar = element.type === proto.DisplayElementType.DisplayElementBar;
  const isStick = element.type === proto.DisplayElementType.DisplayElementStick;
  const isShape =
    element.type === proto.DisplayElementType.DisplayElementRectangle ||
    element.type === proto.DisplayElementType.DisplayElementCircle;
  // A joystick needs room for its outline and dot
  const minSize = isStick ? 3 : 1;
  const resizeImage = (side: 'width' | 'height', value: number) => {
    const current = {
      image: element.image!,
      width: element.width ?? 0,
      height: element.height ?? 0,
    };
    if (!element.image || !current.width || !current.height) {
      return;
    }
    const size = keepProportions
      ? proportionalSize(side, value, imageAspect(current), width, height)
      : {
          width: side === 'width' ? Math.max(1, Math.min(width, value)) : current.width,
          height: side === 'height' ? Math.max(1, Math.min(height, value)) : current.height,
        };
    if (size.width !== current.width || size.height !== current.height) {
      update(withImage(resizeDisplayImage(current, size.width, size.height)));
    }
  };
  return (
    <>
      <Select
        label={t('display.element_type')}
        allowDeselect={false}
        data={[
          {
            value: `${proto.DisplayElementType.DisplayElementText}`,
            label: t('display.types.text'),
          },
          {
            value: `${proto.DisplayElementType.DisplayElementImage}`,
            label: t('display.types.image'),
          },
          { value: `${proto.DisplayElementType.DisplayElementBar}`, label: t('display.types.bar') },
          {
            value: `${proto.DisplayElementType.DisplayElementStick}`,
            label: t('display.types.stick'),
          },
          {
            value: `${proto.DisplayElementType.DisplayElementRectangle}`,
            label: t('display.types.rectangle'),
          },
          {
            value: `${proto.DisplayElementType.DisplayElementCircle}`,
            label: t('display.types.circle'),
          },
        ]}
        value={`${element.type}`}
        onChange={(val) => {
          if (val == null) {
            return;
          }
          const type = parseInt(val, 10) as proto.DisplayElementType;
          // Only what the new type uses is kept, which for frames is only where they are
          const movingFrames = frames
            .filter((frame) => frame.x != null || frame.y != null)
            .map((frame) => ({ x: frame.x, y: frame.y }));
          const cleared = {
            image: null,
            text: null,
            scale: null,
            stickX: null,
            stickY: null,
            outlineWhenOff: null,
            frames: movingFrames,
          };
          if (type === proto.DisplayElementType.DisplayElementBar) {
            update({ ...cleared, type, width: 64, height: 8 });
          } else if (type === proto.DisplayElementType.DisplayElementImage) {
            update({ ...cleared, type, width: 0, height: 0 });
          } else if (
            type === proto.DisplayElementType.DisplayElementRectangle ||
            type === proto.DisplayElementType.DisplayElementCircle
          ) {
            // Keeps the size when going between the two
            update({
              ...cleared,
              type,
              width: isShape ? element.width : 16,
              height: isShape ? element.height : 16,
              outlineWhenOff: isShape ? element.outlineWhenOff : true,
            });
          } else if (type === proto.DisplayElementType.DisplayElementStick) {
            update({
              ...cleared,
              type,
              width: 24,
              height: 24,
              stickX: newStickInput(),
              stickY: newStickInput(),
            });
          } else {
            update({ ...cleared, type, text: 'Santroller', scale: 1, width: null, height: null });
          }
        }}
      />
      <Text size="xs" c="dimmed" mt={4}>
        {t(
          isBar
            ? 'display.bar_description'
            : isStick
              ? 'display.stick_description'
              : isShape
                ? 'display.shape_description'
                : 'display.shown_description'
        )}
      </Text>
      <Group grow mt="xs">
        <NumberInput
          label={t('display.x')}
          min={0}
          max={width - 1}
          value={element.x}
          onChange={(val) => update({ x: Number(val) || 0 })}
        />
        <NumberInput
          label={t('display.y')}
          min={0}
          max={height - 1}
          value={element.y}
          onChange={(val) => update({ y: Number(val) || 0 })}
        />
      </Group>
      {isText && (
        <>
          <TextInput
            mt="xs"
            label={t('display.text')}
            description={t('display.text_description', { count: MAX_TEXT_LENGTH })}
            maxLength={MAX_TEXT_LENGTH}
            value={element.text ?? ''}
            onChange={(event) => update({ text: sanitiseDisplayText(event.currentTarget.value) })}
          />
          <NumberInput
            mt="xs"
            label={t('display.scale')}
            min={1}
            max={MAX_SCALE}
            value={element.scale ?? 1}
            onChange={(val) =>
              update({ scale: Math.min(MAX_SCALE, Math.max(1, Number(val) || 1)) })
            }
          />
        </>
      )}
      {(isBar || isStick || isShape) && (
        <>
          <Group grow mt="xs">
            <NumberInput
              label={t('display.width')}
              min={minSize}
              max={width}
              value={element.width ?? 0}
              onChange={(val) => update({ width: Math.max(minSize, Number(val) || 1) })}
            />
            <NumberInput
              label={t('display.height')}
              min={minSize}
              max={height}
              value={element.height ?? 0}
              onChange={(val) => update({ height: Math.max(minSize, Number(val) || 1) })}
            />
          </Group>
          {isShape && (
            <Switch
              mt="sm"
              label={t('display.outline_when_off')}
              checked={!!element.outlineWhenOff}
              onChange={(event) => update({ outlineWhenOff: event.currentTarget.checked })}
            />
          )}
          {isBar && (
            <Switch
              mt="sm"
              label={t('display.vertical')}
              checked={!!element.vertical}
              onChange={(event) => update({ vertical: event.currentTarget.checked })}
            />
          )}
          {isStick &&
            renderInput &&
            (['x', 'y'] as const).map((axis) => {
              const key = axis === 'x' ? 'stickX' : 'stickY';
              return (
                <Stack key={axis} gap={4} mt="sm">
                  <Text size="sm" fw={500}>
                    {t(`display.stick_${axis}`)}
                  </Text>
                  {renderInput(axis, element[key] ?? newStickInput(), (input) =>
                    update({ [key]: input })
                  )}
                </Stack>
              );
            })}
        </>
      )}
      {isImage && !!element.width && (
        <>
          <Group grow mt="xs">
            <NumberInput
              label={t('display.width')}
              min={1}
              max={width}
              value={element.width ?? 0}
              onChange={(val) => resizeImage('width', Number(val) || 1)}
            />
            <NumberInput
              label={t('display.height')}
              min={1}
              max={height}
              value={element.height ?? 0}
              onChange={(val) => resizeImage('height', Number(val) || 1)}
            />
          </Group>
          <Switch
            mt="sm"
            label={t('display.keep_proportions')}
            checked={keepProportions}
            onChange={(event) => setKeepProportions(event.currentTarget.checked)}
          />
        </>
      )}
      {isImage && (
        <Group mt="xs" gap="xs">
          <FileButton
            accept="image/png,image/jpeg,image/gif,image/bmp,image/webp"
            onChange={(file) => {
              if (!file) {
                return;
              }
              setImageError(false);
              loadDisplayImage(file, width, height)
                .then((loaded) => update(withImage(loaded)))
                .catch(() => setImageError(true));
            }}
          >
            {(props) => (
              <Button size="xs" variant="light" {...props}>
                {t('display.upload_image')}
              </Button>
            )}
          </FileButton>
          <Text size="xs" c={imageError ? 'red' : 'dimmed'}>
            {imageError
              ? t('display.image_error')
              : element.width
                ? t('display.image_size', { width: element.width, height: element.height })
                : t('display.image_description')}
          </Text>
        </Group>
      )}
      <Switch
        mt="sm"
        label={t('display.invert')}
        checked={!!element.invert}
        onChange={(event) => update({ invert: event.currentTarget.checked })}
      />
      <Text size="sm" fw={500} mt="md">
        {t('display.animation')}
      </Text>
      <Text size="xs" c="dimmed">
        {t('display.animation_description')}
      </Text>
      {frames.map((frame, i) => (
        <Card key={i} withBorder padding="xs" mt="xs">
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" fw={500}>
              {t('display.frame', { n: i + 2 })}
            </Text>
            <ActionIcon
              color="red"
              variant="subtle"
              aria-label={t('display.remove_frame')}
              onClick={() => update({ frames: frames.filter((_, j) => j !== i) })}
            >
              <IconTrash style={{ width: '70%', height: '70%' }} />
            </ActionIcon>
          </Group>
          {isText && (
            <TextInput
              mt="xs"
              label={t('display.text')}
              maxLength={MAX_TEXT_LENGTH}
              placeholder={element.text ?? ''}
              value={frame.text ?? ''}
              onChange={(event) => {
                const text = sanitiseDisplayText(event.currentTarget.value);
                // Empty shows the first frame's text
                updateFrame(i, { text: text || null });
              }}
            />
          )}
          {isImage && !!element.width && !!element.height && (
            <Group mt="xs" gap="xs">
              <FileButton
                accept="image/png,image/jpeg,image/gif,image/bmp,image/webp"
                onChange={(file) => {
                  if (!file) {
                    return;
                  }
                  setFrameImageError(null);
                  loadDisplayImageAt(file, element.width!, element.height!)
                    .then((loaded) => updateFrame(i, { image: loaded.image }))
                    .catch(() => setFrameImageError(i));
                }}
              >
                {(props) => (
                  <Button size="xs" variant="light" {...props}>
                    {t('display.upload_image')}
                  </Button>
                )}
              </FileButton>
              <Text size="xs" c={frameImageError === i ? 'red' : 'dimmed'}>
                {frameImageError === i
                  ? t('display.image_error')
                  : frame.image?.length
                    ? t('display.frame_image_description', {
                        width: element.width,
                        height: element.height,
                      })
                    : t('display.frame_image_own')}
              </Text>
            </Group>
          )}
          <Group grow mt="xs">
            <NumberInput
              label={t('display.x')}
              min={0}
              max={width - 1}
              placeholder={`${element.x}`}
              value={frame.x ?? ''}
              onChange={(val) => updateFrame(i, { x: val === '' ? null : Number(val) || 0 })}
            />
            <NumberInput
              label={t('display.y')}
              min={0}
              max={height - 1}
              placeholder={`${element.y}`}
              value={frame.y ?? ''}
              onChange={(val) => updateFrame(i, { y: val === '' ? null : Number(val) || 0 })}
            />
          </Group>
          <Text size="xs" c="dimmed" mt={4}>
            {t('display.frame_position_description')}
          </Text>
        </Card>
      ))}
      <Group mt="xs" align="flex-end">
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          disabled={frames.length >= MAX_EXTRA_FRAMES}
          onClick={() => {
            // Text starts as the frame before's, so Z, ZZ, ZZZ only needs a letter added each time
            const previous = frames.length ? frames[frames.length - 1].text : element.text;
            update({ frames: [...frames, isText && previous ? { text: previous } : {}] });
          }}
        >
          {t('display.add_frame')}
        </Button>
        {frames.length > 0 && (
          <NumberInput
            label={t('display.frame_ms')}
            min={MIN_FRAME_MS}
            max={60000}
            step={50}
            value={element.frameMs || DEFAULT_FRAME_MS}
            onChange={(val) => update({ frameMs: Math.max(MIN_FRAME_MS, Number(val) || 0) })}
          />
        )}
      </Group>
      <Space h="sm" />
      <DisplayPreview
        elements={elements}
        width={width}
        height={height}
        element={element}
        shownFrame={shownFrame}
        onMove={(x, y) =>
          shownFrame === 'play' || shownFrame === 0
            ? update({ x, y })
            : updateFrame(shownFrame - 1, { x, y })
        }
      />
      {frames.length > 0 && (
        <>
          <Select
            mt="xs"
            label={t('display.preview_shows')}
            description={t('display.preview_frame_description')}
            allowDeselect={false}
            value={`${shownFrame}`}
            onChange={(val) =>
              val != null && setPickedFrame(val === 'play' ? 'play' : parseInt(val, 10))
            }
            data={[
              { value: 'play', label: t('display.preview_play') },
              ...Array.from({ length: frames.length + 1 }, (_, n) => ({
                value: `${n}`,
                label: t('display.preview_frame', { n: n + 1 }),
              })),
            ]}
          />
        </>
      )}
    </>
  );
}
