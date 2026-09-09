import React from "react";
import { SafeAreaView, SafeAreaViewProps } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniwindSafeAreaView = withUniwind(SafeAreaView);

type ComponentProps = SafeAreaViewProps;

const StyledSafeAreaView: React.FC<ComponentProps> = ({ children, ...props }) => {
  return <UniwindSafeAreaView {...props}>{children}</UniwindSafeAreaView>;
};

export default StyledSafeAreaView;
