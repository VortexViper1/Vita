import { useWindowDimensions } from "react-native";

import { layout } from "../../theme/spacing";

export function useStackSize(): number {
  const { width } = useWindowDimensions();
  return Math.min(width, layout.maxContentWidth) - layout.screenPadding * 2;
}