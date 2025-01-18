import React, { createContext, useContext } from 'react';
import { UIConfig, uiConfig } from '../config/uiConfig';

const UIContext = createContext<UIConfig>(uiConfig);

export const UIProvider: React.FC<{
  children: React.ReactNode;
  config?: Partial<UIConfig>;
}> = ({ children, config }) => {
  const mergedConfig = { ...uiConfig, ...config };
  
  return (
    <UIContext.Provider value={mergedConfig}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);