import "fast-text-encoding";
import 'web-streams-polyfill/polyfill';
import { registerGlobals } from '@livekit/react-native-webrtc';

// Polyfill DOMException for React Native (needed by livekit-client)
if (typeof global.DOMException === 'undefined') {
  class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name;
    }
  }
  global.DOMException = DOMException;
}

// Ensure TextEncoder/TextDecoder are on global (some RN versions need explicit assignment)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('fast-text-encoding');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Ensure navigator.userAgent is defined for livekit-client browser detection
if (typeof global.navigator !== 'undefined') {
  if (typeof global.navigator.userAgent === 'undefined') {
    // @ts-ignore
    global.navigator.userAgent = 'react-native';
  }
} else {
  // @ts-ignore
  global.navigator = { userAgent: 'react-native' };
}

import "expo-router/entry";

registerGlobals();
