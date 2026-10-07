import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import {
  listen as tauriListen,
  type Event,
  type EventCallback,
  type EventName,
  type Options,
  type UnlistenFn,
} from "@tauri-apps/api/event";
import { localizeBackendText } from "./localize";

const CJK_PATTERN = /[\u3400-\u9fff\uff00-\uffef\u3000-\u303f]/;

export type { Event, EventCallback, EventName, Options, UnlistenFn };
export type { InvokeArgs, InvokeOptions } from "@tauri-apps/api/core";

function localizeRejection(error: unknown): unknown {
  if (typeof error === "string") {
    return localizeBackendText(error);
  }
  if (error === null || typeof error !== "object" || !("message" in error)) {
    return error;
  }

  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") {
    return error;
  }

  const localizedMessage = localizeBackendText(message);
  if (localizedMessage === message) {
    return error;
  }

  try {
    (error as { message: string }).message = localizedMessage;
    return error;
  } catch {
    const descriptors = Object.getOwnPropertyDescriptors(error);
    const messageDescriptor = descriptors.message;
    Reflect.deleteProperty(descriptors, "message");
    const localizedError = Object.create(Object.getPrototypeOf(error));
    Object.defineProperties(localizedError, descriptors);
    Object.defineProperty(localizedError, "message", {
      configurable: messageDescriptor?.configurable ?? true,
      enumerable: messageDescriptor?.enumerable ?? true,
      value: localizedMessage,
      writable: true,
    });
    return localizedError;
  }
}

export function invoke<T>(
  command: Parameters<typeof tauriInvoke>[0],
  args?: Parameters<typeof tauriInvoke>[1],
  options?: Parameters<typeof tauriInvoke>[2],
): Promise<T> {
  const pending = arguments.length === 1
    ? tauriInvoke<T>(command)
    : arguments.length === 2
    ? tauriInvoke<T>(command, args)
    : tauriInvoke<T>(command, args, options);

  return pending.catch((error: unknown) => {
    throw localizeRejection(error);
  });
}

export function listen<T>(
  event: EventName,
  handler: EventCallback<T>,
  options?: Options,
): Promise<UnlistenFn> {
  return tauriListen<T>(event, (eventData: Event<T>) => {
    const payload = eventData.payload;
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
      handler(eventData);
      return;
    }

    const localizedPayload: Record<string, unknown> = {
      ...(payload as Record<string, unknown>),
    };
    for (const [key, value] of Object.entries(localizedPayload)) {
      if (typeof value === "string" && CJK_PATTERN.test(value)) {
        localizedPayload[key] = localizeBackendText(value);
      }
    }

    handler({ ...eventData, payload: localizedPayload as T });
  }, options);
}
