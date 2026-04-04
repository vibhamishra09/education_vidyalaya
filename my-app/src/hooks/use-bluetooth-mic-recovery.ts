import { useCallback, useEffect, useRef } from 'react';
import {
  type AudioCaptureOptions,
  type LocalParticipant,
  type Room,
  RoomEvent,
  Track,
} from 'livekit-client';

const BLUETOOTH_AUDIO_LABEL_PATTERN =
  /airpods|air pods|bluetooth|buds|earbuds|headset|hands-free|handsfree|freebuds|galaxy buds|jabra|bose|beats|sony/i;

const DEFAULT_AUDIO_CAPTURE_OPTIONS: AudioCaptureOptions = {
  deviceId: 'default',
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

type UseBluetoothMicRecoveryOptions = {
  room: Room | null | undefined;
  localParticipant: LocalParticipant | null | undefined;
  enabled?: boolean;
  captureOptions?: AudioCaptureOptions;
};

function isVirtualAudioInputDeviceId(deviceId: string | null | undefined): boolean {
  return deviceId === 'default' || deviceId === 'communications';
}

function serializeAudioInputDevices(devices: MediaDeviceInfo[]): string {
  return devices
    .filter((device) => device.kind === 'audioinput')
    .map((device) => `${device.deviceId}:${device.label}:${device.groupId}`)
    .sort()
    .join('|');
}

function getPreferredAudioInputDeviceId(
  devices: MediaDeviceInfo[],
  selectedDeviceId: string | null,
): string | null {
  if (!devices.length) return null;

  if (
    selectedDeviceId &&
    devices.some((device) => device.deviceId === selectedDeviceId)
  ) {
    return selectedDeviceId;
  }

  const bluetoothDefaultDevice = devices.find(
    (device) =>
      device.deviceId === 'default' &&
      BLUETOOTH_AUDIO_LABEL_PATTERN.test(device.label || ''),
  );
  if (bluetoothDefaultDevice) {
    return bluetoothDefaultDevice.deviceId;
  }

  const defaultDevice = devices.find((device) => device.deviceId === 'default');
  if (defaultDevice) {
    return defaultDevice.deviceId;
  }

  const bluetoothDevice = devices.find((device) =>
    BLUETOOTH_AUDIO_LABEL_PATTERN.test(device.label || ''),
  );
  if (bluetoothDevice) {
    return bluetoothDevice.deviceId;
  }

  return devices[0]?.deviceId ?? null;
}

export function useBluetoothMicRecovery({
  room,
  localParticipant,
  enabled = true,
  captureOptions,
}: UseBluetoothMicRecoveryOptions) {
  const selectedDeviceIdRef = useRef<string | null>(null);
  const lastAudioInputSnapshotRef = useRef<string>('');
  const hadBluetoothDeviceRef = useRef(false);
  const recoveryInFlightRef = useRef(false);

  const recoverPreferredMicrophone = useCallback(
    async (reason: 'init' | 'mic-enabled' | 'devicechange' | 'active-device') => {
      if (
        !enabled ||
        !room ||
        !localParticipant ||
        recoveryInFlightRef.current ||
        typeof window === 'undefined' ||
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.enumerateDevices
      ) {
        return;
      }

      recoveryInFlightRef.current = true;

      try {
        const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
          (device) => device.kind === 'audioinput',
        );

        const deviceSnapshot = serializeAudioInputDevices(devices);
        const deviceListChanged =
          lastAudioInputSnapshotRef.current !== '' &&
          lastAudioInputSnapshotRef.current !== deviceSnapshot;
        lastAudioInputSnapshotRef.current = deviceSnapshot;

        const bluetoothDeviceAvailable = devices.some((device) =>
          BLUETOOTH_AUDIO_LABEL_PATTERN.test(device.label || ''),
        );

        const activeDeviceId = room.getActiveDevice('audioinput') ?? null;
        if (activeDeviceId) {
          selectedDeviceIdRef.current = activeDeviceId;
        }

        const micTrack = localParticipant.getTrackPublication(
          Track.Source.Microphone,
        )?.audioTrack;

        const currentTrackDeviceId = micTrack
          ? await micTrack.getDeviceId(false).catch(() => undefined)
          : undefined;

        if (currentTrackDeviceId) {
          selectedDeviceIdRef.current = currentTrackDeviceId;
        }

        const preferredDeviceId = getPreferredAudioInputDeviceId(
          devices,
          selectedDeviceIdRef.current,
        );

        if (preferredDeviceId) {
          selectedDeviceIdRef.current = preferredDeviceId;
        }

        if (!localParticipant.isMicrophoneEnabled || !preferredDeviceId) {
          hadBluetoothDeviceRef.current = bluetoothDeviceAvailable;
          return;
        }

        const activeDeviceMissing =
          !!activeDeviceId &&
          !isVirtualAudioInputDeviceId(activeDeviceId) &&
          !devices.some((device) => device.deviceId === activeDeviceId);
        const currentTrackDeviceMissing =
          !!currentTrackDeviceId &&
          !isVirtualAudioInputDeviceId(currentTrackDeviceId) &&
          !devices.some((device) => device.deviceId === currentTrackDeviceId);
        const bluetoothAvailabilityChanged =
          hadBluetoothDeviceRef.current !== bluetoothDeviceAvailable;

        hadBluetoothDeviceRef.current = bluetoothDeviceAvailable;

        const shouldRecover =
          reason === 'mic-enabled' ||
          activeDeviceMissing ||
          currentTrackDeviceMissing ||
          (deviceListChanged &&
            (bluetoothAvailabilityChanged ||
              isVirtualAudioInputDeviceId(activeDeviceId) ||
              isVirtualAudioInputDeviceId(currentTrackDeviceId)));

        if (!shouldRecover) {
          return;
        }

        const nextCaptureOptions: AudioCaptureOptions = {
          ...DEFAULT_AUDIO_CAPTURE_OPTIONS,
          ...captureOptions,
          deviceId: preferredDeviceId,
        };

        try {
          await room.switchActiveDevice(
            'audioinput',
            preferredDeviceId,
            !isVirtualAudioInputDeviceId(preferredDeviceId),
          );
        } catch {
          if (micTrack) {
            await micTrack.restartTrack(nextCaptureOptions);
          } else {
            await localParticipant.setMicrophoneEnabled(true, nextCaptureOptions);
          }
        }
      } finally {
        recoveryInFlightRef.current = false;
      }
    },
    [captureOptions, enabled, localParticipant, room],
  );

  useEffect(() => {
    if (!enabled || !room || !localParticipant) return;

    void recoverPreferredMicrophone('init');

    const handleBrowserDeviceChange = () => {
      void recoverPreferredMicrophone('devicechange');
    };

    const handleActiveDeviceChanged = (
      kind: MediaDeviceKind,
      deviceId: string,
    ) => {
      if (kind !== 'audioinput') return;
      selectedDeviceIdRef.current = deviceId;
      void recoverPreferredMicrophone('active-device');
    };

    navigator.mediaDevices?.addEventListener?.('devicechange', handleBrowserDeviceChange);
    room.on(RoomEvent.MediaDevicesChanged, handleBrowserDeviceChange);
    room.on(RoomEvent.ActiveDeviceChanged, handleActiveDeviceChanged);

    return () => {
      navigator.mediaDevices?.removeEventListener?.(
        'devicechange',
        handleBrowserDeviceChange,
      );
      room.off(RoomEvent.MediaDevicesChanged, handleBrowserDeviceChange);
      room.off(RoomEvent.ActiveDeviceChanged, handleActiveDeviceChanged);
    };
  }, [enabled, localParticipant, recoverPreferredMicrophone, room]);

  useEffect(() => {
    if (!enabled || !localParticipant?.isMicrophoneEnabled) return;
    void recoverPreferredMicrophone('mic-enabled');
  }, [enabled, localParticipant?.isMicrophoneEnabled, recoverPreferredMicrophone]);
}
