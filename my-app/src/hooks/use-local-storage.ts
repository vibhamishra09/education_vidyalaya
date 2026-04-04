"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Read value from localStorage
 */
function readFromLocalStorage<T>(
  key: string,
  initialValue: T,
  expiresIn: number | undefined,
  deserialize: (value: string) => T
): T {
  if (typeof window === "undefined") {
    return initialValue;
  }

  try {
    const item = window.localStorage.getItem(key);
    if (!item) {
      return initialValue;
    }

    const parsed = JSON.parse(item);
    
    // Check if the value has expired (only for items with timestamp)
    if (expiresIn && parsed && typeof parsed === 'object' && 'timestamp' in parsed) {
      const now = Date.now();
      if (now - parsed.timestamp > expiresIn) {
        window.localStorage.removeItem(key);
        return initialValue;
      }
      return deserialize(JSON.stringify(parsed.value));
    }

    return deserialize(item);
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return initialValue;
  }
}

/**
 * Custom hook for syncing state with localStorage
 * Handles SSR by only accessing localStorage on the client
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    /** Time in milliseconds before the value expires (optional) */
    expiresIn?: number;
    /** Custom serializer (default: JSON.stringify) */
    serialize?: (value: T) => string;
    /** Custom deserializer (default: JSON.parse) */
    deserialize?: (value: string) => T;
  }
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? JSON.parse;
  const expiresIn = options?.expiresIn;

  // Use refs to maintain stable references
  const initialValueRef = useRef(initialValue);
  const serializeRef = useRef(serialize);
  const deserializeRef = useRef(deserialize);
  const keyRef = useRef(key);
  const expiresInRef = useRef(expiresIn);

  // Start with initial value for SSR, will update after hydration
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Hydrate from localStorage on mount (client-side only)
  useEffect(() => {
    const value = readFromLocalStorage(
      key,
      initialValueRef.current,
      expiresIn,
      deserializeRef.current
    );
    setStoredValue(value);
  }, [key, expiresIn]);

  // Update refs when values change
  useEffect(() => {
    initialValueRef.current = initialValue;
    serializeRef.current = serialize;
    deserializeRef.current = deserialize;
    keyRef.current = key;
    expiresInRef.current = expiresIn;
  });

  // Update localStorage when value changes
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prevValue) => {
          const valueToStore =
            value instanceof Function ? value(prevValue) : value;

          if (typeof window !== "undefined") {
            const currentExpiresIn = expiresInRef.current;
            const currentKey = keyRef.current;
            
            if (currentExpiresIn) {
              // Store with timestamp for expiration
              const item = {
                value: JSON.parse(serializeRef.current(valueToStore)),
                timestamp: Date.now(),
              };
              window.localStorage.setItem(currentKey, JSON.stringify(item));
            } else {
              window.localStorage.setItem(currentKey, serializeRef.current(valueToStore));
            }
          }

          return valueToStore;
        });
      } catch (error) {
        console.warn(`Error setting localStorage key "${keyRef.current}":`, error);
      }
    },
    [] // No dependencies - we use refs
  );

  // Clear the stored value
  const clearValue = useCallback(() => {
    try {
      setStoredValue(initialValueRef.current);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(keyRef.current);
      }
    } catch (error) {
      console.warn(`Error clearing localStorage key "${keyRef.current}":`, error);
    }
  }, []); // No dependencies - we use refs

  return [storedValue, setValue, clearValue];
}

/**
 * Hook specifically for form state persistence
 * Automatically syncs form data to localStorage with debouncing
 */
export function useFormPersistence<T extends object>(
  formKey: string,
  initialData: T,
  options?: {
    /** Debounce time in ms (default: 500) */
    debounceMs?: number;
    /** Time in ms before form data expires (default: 24 hours) */
    expiresIn?: number;
    /** Fields to exclude from persistence */
    excludeFields?: (keyof T)[];
  }
): {
  formData: T;
  setFormData: (data: T | ((prev: T) => T)) => void;
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  clearForm: () => void;
  hasStoredData: boolean;
} {
  const expiresIn = options?.expiresIn ?? 24 * 60 * 60 * 1000; // 24 hours
  const excludeFields = options?.excludeFields ?? [];

  // Use refs for stable references
  const excludeFieldsRef = useRef(excludeFields);
  const initialDataRef = useRef(initialData);

  useEffect(() => {
    excludeFieldsRef.current = excludeFields;
    initialDataRef.current = initialData;
  });

  const storageKey = `form_${formKey}`;

  const [formData, setFormDataInternal, clearForm] = useLocalStorage<T>(
    storageKey,
    initialData,
    { expiresIn }
  );

  /** Must match server first paint (false); sync from localStorage after mount to avoid hydration mismatch. */
  const [hasStoredData, setHasStoredData] = useState(false);

  useEffect(() => {
    try {
      setHasStoredData(!!window.localStorage.getItem(storageKey));
    } catch {
      setHasStoredData(false);
    }
  }, [storageKey]);

  const setFormData = useCallback(
    (data: T | ((prev: T) => T)) => {
      setHasStoredData(true);
      setFormDataInternal(data);
    },
    [setFormDataInternal]
  );

  const updateField = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setHasStoredData(true);
      setFormDataInternal((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [setFormDataInternal]
  );

  const handleClearForm = useCallback(() => {
    clearForm();
    setHasStoredData(false);
  }, [clearForm]);

  return {
    formData,
    setFormData,
    updateField,
    clearForm: handleClearForm,
    hasStoredData,
  };
}

/**
 * Hook for persisting tab state across page reloads
 */
export function useTabPersistence<T extends string>(
  tabKey: string,
  defaultTab: T,
  validTabs: readonly T[]
): [T, (tab: T) => void] {
  // Use refs for stable references
  const validTabsRef = useRef(validTabs);
  const defaultTabRef = useRef(defaultTab);

  useEffect(() => {
    validTabsRef.current = validTabs;
    defaultTabRef.current = defaultTab;
  });

  const [activeTab, setActiveTabInternal] = useLocalStorage<T>(
    `tab_${tabKey}`,
    defaultTab
  );

  // Validate that the stored tab is still valid after hydration
  useEffect(() => {
    if (activeTab && !validTabsRef.current.includes(activeTab)) {
      setActiveTabInternal(defaultTabRef.current);
    }
  }, [activeTab, setActiveTabInternal]);

  const setActiveTab = useCallback(
    (tab: T) => {
      if (validTabsRef.current.includes(tab)) {
        setActiveTabInternal(tab);
      }
    },
    [setActiveTabInternal]
  );

  // Return the active tab (or default if not valid)
  const validTab = validTabsRef.current.includes(activeTab) ? activeTab : defaultTab;

  return [validTab, setActiveTab];
}

/**
 * Hook for persisting filter state
 */
export function useFilterPersistence<T>(
  filterKey: string,
  initialFilters: T,
  options?: {
    /** Time in ms before filters expire (default: 1 hour) */
    expiresIn?: number;
  }
): {
  filters: T;
  setFilters: (filters: T | ((prev: T) => T)) => void;
  updateFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  resetFilters: () => void;
} {
  const expiresIn = options?.expiresIn ?? 60 * 60 * 1000; // 1 hour

  const [filters, setFiltersInternal, resetFilters] = useLocalStorage<T>(
    `filters_${filterKey}`,
    initialFilters,
    { expiresIn }
  );

  const setFilters = useCallback(
    (newFilters: T | ((prev: T) => T)) => {
      setFiltersInternal(newFilters);
    },
    [setFiltersInternal]
  );

  const updateFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFiltersInternal((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [setFiltersInternal]
  );

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
  };
}

