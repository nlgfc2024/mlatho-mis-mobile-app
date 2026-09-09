import { FloatingActionButton, Host, Icon } from "@expo/ui/jetpack-compose";
import AddIcon from "@expo/material-symbols/add.xml";
import { Link, useRouter } from "expo-router";
import { View } from "react-native";

interface CreateFabProps {
  href: Parameters<typeof Link>[0]["href"];
  /** Accessibility label for the icon. */
  contentDescription?: string;
}

/**
 * Material 3 FloatingActionButton pinned to the bottom-right of a list screen,
 * used app-wide as the primary "create new" action (replaces the old header
 * add button). Android-only, since it renders via `@expo/ui/jetpack-compose`.
 */
export default function CreateFab({ href, contentDescription }: CreateFabProps) {
  const router = useRouter();

  return (
    <View className="absolute bottom-6 right-6">
      <Host matchContents>
        <FloatingActionButton
          containerColor="#0d542b"
          onClick={() => router.push(href)}
        >
          <FloatingActionButton.Icon>
            <Icon
              source={AddIcon}
              tint="#ffffff"
              contentDescription={contentDescription}
            />
          </FloatingActionButton.Icon>
        </FloatingActionButton>
      </Host>
    </View>
  );
}
