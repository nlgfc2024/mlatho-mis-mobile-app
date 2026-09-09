import type { ScrollViewProps } from "react-native";
import { FlatList, ScrollView, SectionList } from "react-native";

type ScrollIndicatorDefaults = Pick<
  ScrollViewProps,
  "automaticallyAdjustsScrollIndicatorInsets" | "scrollIndicatorInsets"
>;

type ComponentWithDefaultProps = {
  defaultProps?: Partial<ScrollIndicatorDefaults>;
};

const edgeToEdgeScrollIndicatorDefaults: ScrollIndicatorDefaults = {
  automaticallyAdjustsScrollIndicatorInsets: false,
  scrollIndicatorInsets: {
    left: 0,
    right: 0,
  },
};

function applyScrollIndicatorDefaults(component: ComponentWithDefaultProps) {
  component.defaultProps = {
    ...component.defaultProps,
    ...edgeToEdgeScrollIndicatorDefaults,
  };
}

applyScrollIndicatorDefaults(ScrollView as unknown as ComponentWithDefaultProps);
applyScrollIndicatorDefaults(FlatList as unknown as ComponentWithDefaultProps);
applyScrollIndicatorDefaults(SectionList as unknown as ComponentWithDefaultProps);
