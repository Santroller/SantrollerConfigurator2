/// <reference types="w3c-web-usb" />
import { proto } from './config.js';

// Talks to the config interface over WebUSB, for browsers where WebHID can't reach the controller (Chrome on
// Android has had navigator.hid since 158, but it lists no devices). WebUSB can't claim a HID interface, so the
// firmware also takes the config reports as vendor requests to the device. It mimics the parts of HIDDevice the
// configurator uses, so it can be used in place of one.
//
// The request matches SANTROLLER_CONFIG_VENDOR_REQUEST in the firmware (include/emulation/usb/hid_device.h):
// wValue is the same as a HID GET_REPORT / SET_REPORT (report type << 8 | report id), and the data includes the
// report id. Reading the ReportIdConfig input report takes the queued events, as there is no endpoint for them.

const VENDOR_REQUEST = 0x53;
const VENDOR_INDEX = 0x5343;
const REPORT_TYPE_INPUT = 1;
const REPORT_TYPE_OUTPUT = 2;
const REPORT_TYPE_FEATURE = 3;
// A report id and a 63 byte report, the same as the HID interface
const REPORT_SIZE = 63;
const EVENT_POLL_INTERVAL_MS = 10;

export const SANTROLLER_FILTER: USBDeviceFilter = { vendorId: 0x1209, productId: 0x2883 };

// Feature reports the firmware exposes. Sizes are only needed where the configurator checks them (the firmware
// upload), the rest come back at whatever size the firmware sends.
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
  proto.ReportId.ReportIdConfigInfoSaved,
];

export const isAndroid = /Android/i.test(navigator.userAgent);

// WebHID reaches the controller everywhere it exists, except Android
export function webHidUsable() {
  return !!navigator.hid && !isAndroid;
}

function toUint8Array(data: BufferSource) {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

// Firmware from before the vendor request stalls it
export class WebUsbUnsupportedFirmwareError extends Error {}

export class WebUsbConfigDevice extends EventTarget {
  readonly collections: HIDCollectionInfo[];
  // Transfers one at a time, so the events poll can't land between a config read and the one after it
  private queue: Promise<unknown> = Promise.resolve();
  private pollTimer?: ReturnType<typeof setTimeout>;
  private polling = false;
  private onInputReport?: (evt: HIDInputReportEvent) => void;

  constructor(readonly device: USBDevice) {
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
  }

  static isSupported() {
    return !!navigator.usb && !webHidUsable();
  }

  static matches(device: USBDevice) {
    return (
      device.vendorId === SANTROLLER_FILTER.vendorId &&
      device.productId === SANTROLLER_FILTER.productId
    );
  }

  static async request() {
    return new WebUsbConfigDevice(
      await navigator.usb.requestDevice({ filters: [SANTROLLER_FILTER] })
    );
  }

  get vendorId() {
    return this.device.vendorId;
  }

  get productId() {
    return this.device.productId;
  }

  get productName() {
    return this.device.productName ?? 'Santroller';
  }

  get opened() {
    return this.device.opened;
  }

  async open() {
    if (!this.device.opened) {
      await this.device.open();
    }
    if (!this.device.configuration) {
      await this.device.selectConfiguration(1);
    }
    // Older firmware doesn't know the request, and stalls it
    const probe = await this.transferIn(REPORT_TYPE_FEATURE, proto.ReportId.ReportIdGetVersion);
    if (probe.status !== 'ok') {
      await this.device.close().catch(() => undefined);
      throw new WebUsbUnsupportedFirmwareError(
        'This firmware is too old to configure over WebUSB, update it with a UF2 first'
      );
    }
    this.polling = true;
    this.schedulePoll();
  }

  async close() {
    this.polling = false;
    this.stopPolling();
    await this.enqueue(() => this.device.close()).catch(() => undefined);
  }

  // Same layout as WebHID: the report id first, then the report
  async receiveFeatureReport(reportId: number): Promise<DataView> {
    const result = await this.transferIn(REPORT_TYPE_FEATURE, reportId);
    if (result.status !== 'ok' || !result.data) {
      throw new DOMException(
        `Failed to read report 0x${reportId.toString(16)} (${result.status})`,
        'NetworkError'
      );
    }
    return result.data;
  }

  async sendFeatureReport(reportId: number, data: BufferSource): Promise<void> {
    await this.transferOut(REPORT_TYPE_FEATURE, reportId, data);
  }

  async sendReport(reportId: number, data: BufferSource): Promise<void> {
    await this.transferOut(REPORT_TYPE_OUTPUT, reportId, data);
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

  private transferIn(reportType: number, reportId: number) {
    return this.enqueue(() =>
      this.device.controlTransferIn(
        {
          requestType: 'vendor',
          recipient: 'device',
          request: VENDOR_REQUEST,
          value: (reportType << 8) | reportId,
          index: VENDOR_INDEX,
        },
        REPORT_SIZE + 1
      )
    );
  }

  private async transferOut(reportType: number, reportId: number, data: BufferSource) {
    const payload = toUint8Array(data);
    const report = new Uint8Array(payload.byteLength + 1);
    report[0] = reportId;
    report.set(payload, 1);
    const result = await this.enqueue(() =>
      this.device.controlTransferOut(
        {
          requestType: 'vendor',
          recipient: 'device',
          request: VENDOR_REQUEST,
          value: (reportType << 8) | reportId,
          index: VENDOR_INDEX,
        },
        report
      )
    );
    // A stall means the firmware refused it, e.g. another configurator has the controller open
    if (result.status !== 'ok') {
      throw new DOMException(
        `Failed to write report 0x${reportId.toString(16)} (${result.status})`,
        'NetworkError'
      );
    }
  }

  private schedulePoll() {
    this.stopPolling();
    this.pollTimer = setTimeout(() => this.poll(), EVENT_POLL_INTERVAL_MS);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async poll() {
    this.pollTimer = undefined;
    if (!this.polling || !this.device.opened) {
      return;
    }
    try {
      const result = await this.transferIn(REPORT_TYPE_INPUT, proto.ReportId.ReportIdConfig);
      // Just the report id when there are no events
      if (
        result.status === 'ok' &&
        result.data &&
        result.data.byteLength > 1 &&
        this.onInputReport
      ) {
        // WebHID leaves the report id out of the data, and the report handler decodes the whole buffer
        const data = new Uint8Array(result.data.byteLength - 1);
        data.set(
          new Uint8Array(result.data.buffer, result.data.byteOffset + 1, result.data.byteLength - 1)
        );
        this.onInputReport({
          reportId: proto.ReportId.ReportIdConfig,
          data: new DataView(data.buffer),
          device: this as unknown as HIDDevice,
        } as HIDInputReportEvent);
      }
    } catch (e) {
      // closed or unplugged, navigator.usb's disconnect event deals with that
      if (!this.device.opened) {
        return;
      }
      console.log('WebUSB event poll failed', e);
    }
    if (this.polling && this.device.opened && this.pollTimer === undefined) {
      this.schedulePoll();
    }
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.catch(() => undefined);
    return result;
  }
}
