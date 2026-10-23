import { useWindowDimensions } from 'react-native';
import { layoutClass } from './layout-math';

export * from './layout-math';

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const cls = layoutClass(width);
  return {
    width,
    height,
    cls,
    isPhone: cls === 'phone',
    isTablet: cls !== 'phone',
    isDesktop: cls === 'desktop' || cls === 'wide',
  };
}
