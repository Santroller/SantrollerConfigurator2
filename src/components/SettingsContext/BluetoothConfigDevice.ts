import { proto } from './config.js';

// Talks to the config service a Santroller bluetooth controller exposes over plain GATT, for browsers
// with Web Bluetooth but no WebHID (e.g. Chrome on Android). It mimics the parts of HIDDevice the
// configurator uses, so it can be used in place of one.
//
// Each config report id has its own characteristic (the last byte of the UUID is the report id):
// reading it gets the feature report, writing it sets the feature report, and the ReportIdConfig
// characteristic notifies config events.

export const SANTROLLER_CONFIG_SERVICE = '53414e54-524f-4c4c-4552-000000000000';

// Feature reports the firmware exposes. Sizes are only needed where the configurator checks them
// (the firmware upload), the rest come back at whatever size the firmware sends.
const FEATURE_REPORTS = [
  proto.ReportId.ReportIdConfig,
  proto.ReportId.ReportIdConfigInfo,
  proto.ReportId.ReportIdLoaded,
  proto.ReportId.ReportIdKeepalive,
  proto.ReportId.ReportIdBootloader,
  proto.ReportId.ReportIdCommand,
  proto.ReportId.ReportIdGetActiveProfiles,
  proto.ReportId.ReportIdGetVersion,
  proto.ReportId.ReportIdUpdateFirmware,
  proto.ReportId.ReportIdUploadFirmware,
  proto.ReportId.ReportIdGetType,
];
const REPORT_SIZE = 63;

// The firmware drops the tool after a second without a keepalive. Every GATT write is a round trip,
// so don't send the configurator's (very frequent) keepalives more often than needed.
const KEEPALIVE_MIN_INTERVAL_MS = 200;

function toUint8Array(data: BufferSource) {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

export class BluetoothConfigDevice extends EventTarget {
  readonly vendorId = 0x1209;
  readonly productId = 0x2882;
  readonly collections: HIDCollectionInfo[];
  private characteristics = new Map<number, BluetoothRemoteGATTCharacteristic>();
  // Web Bluetooth only allows one GATT operation at a time
  private queue: Promise<unknown> = Promise.resolve();
  private lastKeepalive = 0;
  private onInputReport?: (evt: HIDInputReportEvent) => void;

  constructor(readonly device: BluetoothDevice) {
    super();
    // Describe the reports the same way WebHID would, so the firmware upload picks the 63 byte feature report path
    const reportInfo = (reportId: number) => ({
      reportId,
      items: [{ reportSize: 8, reportCount: REPORT_SIZE }],
    });
    this.collections = [
      {
        usagePage: 0xff00,
        usage: 1,
        type: 1,
        children: [],
        inputReports: [reportInfo(proto.ReportId.ReportIdConfig)],
        outputReports: [],
        featureReports: FEATURE_REPORTS.map(reportInfo),
      } as unknown as HIDCollectionInfo,
    ];
    device.addEventListener('gattserverdisconnected', () => {
      this.characteristics.clear();
      this.dispatchEvent(new Event('disconnect'));
    });
  }

  static isSupported() {
    return !!navigator.bluetooth;
  }

  static async request() {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'Santroller' }],
      optionalServices: [SANTROLLER_CONFIG_SERVICE],
    });
    return new BluetoothConfigDevice(device);
  }

  get productName() {
    return this.device.name ?? 'Santroller';
  }

  get opened() {
    return !!this.device.gatt?.connected && this.characteristics.size > 0;
  }

  async open() {
    const server = await this.device.gatt!.connect();
    const service = await server.getPrimaryService(SANTROLLER_CONFIG_SERVICE);
    this.characteristics.clear();
    for (const characteristic of await service.getCharacteristics()) {
      const match = /^53414e54-524f-4c4c-4552-0000000000([0-9a-f]{2})$/.exec(characteristic.uuid);
      if (match) {
        this.characteristics.set(parseInt(match[1], 16), characteristic);
      }
    }
    const events = this.characteristic(proto.ReportId.ReportIdConfig);
    events.addEventListener('characteristicvaluechanged', this.handleNotification);
    await events.startNotifications();
  }

  async close() {
    this.characteristics
      .get(proto.ReportId.ReportIdConfig)
      ?.removeEventListener('characteristicvaluechanged', this.handleNotification);
    this.characteristics.clear();
    this.device.gatt?.disconnect();
  }

  // Same layout as WebHID: the report id first, then the report
  async receiveFeatureReport(reportId: number): Promise<DataView> {
    const value = await this.enqueue(() => this.characteristic(reportId).readValue());
    const data = new Uint8Array(value.byteLength + 1);
    data[0] = reportId;
    data.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), 1);
    return new DataView(data.buffer);
  }

  async sendFeatureReport(reportId: number, data: BufferSource): Promise<void> {
    if (reportId === proto.ReportId.ReportIdKeepalive) {
      const now = Date.now();
      if (now - this.lastKeepalive < KEEPALIVE_MIN_INTERVAL_MS) {
        return;
      }
      this.lastKeepalive = now;
    }
    // copy, as callers reuse their buffers while the write is queued
    const payload = toUint8Array(data).slice();
    await this.enqueue(() => this.characteristic(reportId).writeValueWithResponse(payload));
  }

  sendReport(reportId: number, data: BufferSource): Promise<void> {
    return this.sendFeatureReport(reportId, data);
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | ((evt: HIDInputReportEvent) => void) | null,
    options?: boolean | AddEventListenerOptions
  ) {
    if (type === 'inputreport') {
      this.onInputReport = listener as (evt: HIDInputReportEvent) => void;
      return;
    }
    super.addEventListener(type, listener as EventListenerOrEventListenerObject | null, options);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | ((evt: HIDInputReportEvent) => void) | null,
    options?: boolean | EventListenerOptions
  ) {
    if (type === 'inputreport') {
      if (this.onInputReport === listener) {
        this.onInputReport = undefined;
      }
      return;
    }
    super.removeEventListener(type, listener as EventListenerOrEventListenerObject | null, options);
  }

  private handleNotification = (evt: Event) => {
    const value = (evt.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value || !this.onInputReport) {
      return;
    }
    // copy into its own buffer, as the report handler decodes the whole buffer
    const data = new Uint8Array(value.byteLength);
    data.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
    this.onInputReport({
      reportId: proto.ReportId.ReportIdConfig,
      data: new DataView(data.buffer),
      device: this as unknown as HIDDevice,
    } as HIDInputReportEvent);
  };

  private characteristic(reportId: number) {
    const characteristic = this.characteristics.get(reportId);
    if (!characteristic) {
      throw new DOMException(
        `No characteristic for report 0x${reportId.toString(16)}`,
        'NotFoundError'
      );
    }
    return characteristic;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.catch(() => undefined);
    return result;
  }
}
