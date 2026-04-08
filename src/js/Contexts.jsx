import { createContext } from 'react';
export const DatabaseContext = createContext(null);
export const BasicInfoContext = createContext(null);
export const BasicInfoUpdaterContext = createContext(() => {});
export const MetadataContext = createContext({});
export const EnvContext = createContext({});
export const UiSettingsContext = createContext({ logoStyle: "colored" });
export const UiSettingsUpdaterContext = createContext(() => {});
