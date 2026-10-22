import React, { createContext, useContext } from 'react';

/**
 * Type and control scale. The desktop studio renders at 0.8 so four panes fit
 * on one screen; everywhere else keeps the iPhone sizes (1).
 */
const DensityContext = createContext(1);
export const useDensity = () => useContext(DensityContext);
export function Density({
  scale,
  children,
}: React.PropsWithChildren<{ scale: number }>) {
  return (
    <DensityContext.Provider value={scale}>{children}</DensityContext.Provider>
  );
}
