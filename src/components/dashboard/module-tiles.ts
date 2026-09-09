import { type Href } from "expo-router";
import {
  BadgeDollarSign,
  CalendarRange,
  GraduationCap,
  Headset,
  LayoutDashboard,
  MessagesSquare,
  ScanLine,
  SquarePen,
  TrafficCone,
  Users,
  type LucideIcon,
} from "lucide-react-native";

export type ModuleTileId =
  | "grievance"
  | "targeting"
  | "data_update"
  | "payments"
  | "pwp"
  | "quick_information"
  | "training"
  | "communication"
  | "coordination"
  | "community_session";

export type ModuleTileConfig = {
  id: ModuleTileId;
  icon: LucideIcon;
  titleKey: string;
  subtitleKey: string;
  href?: Href;
  push?: boolean;
  /** Muted styling for modules without a destination yet. */
  muted?: boolean;
  /** Backend module names used to intersect this tile with active-role rights. */
  permissionModules: string[];
  /** Exact backend query rights required when a module exposes multiple resources. */
  permissionNames?: string[];
};

/** All module tiles, in their default dashboard order. */
export const MODULE_TILES: ModuleTileConfig[] = [
  {
    id: "grievance",
    icon: Headset,
    titleKey: "grievance",
    subtitleKey: "grievance_subtitle",
    href: "/grievance",
    permissionModules: ["ticket"],
  },
  {
    id: "targeting",
    icon: ScanLine,
    titleKey: "targeted_members",
    subtitleKey: "targeting_subtitle",
    href: "/targeted-members",
    permissionModules: ["individual", "social_protection"],
    permissionNames: ["gql_individual_search_perms"],
  },
  {
    id: "data_update",
    icon: SquarePen,
    titleKey: "data_update",
    subtitleKey: "data_update_subtitle",
    href: "/case-management",
    permissionModules: ["individual", "social_protection"],
    permissionNames: ["gql_group_search_perms"],
  },
  {
    id: "payments",
    icon: BadgeDollarSign,
    titleKey: "payments",
    subtitleKey: "payments_subtitle",
    muted: true,
    permissionModules: ["payment", "payment_cycle", "payroll"],
  },
  {
    id: "pwp",
    icon: TrafficCone,
    titleKey: "pwp",
    subtitleKey: "pwp_subtitle",
    href: "/(protected)/(app)/pwp",
    permissionModules: ["pwp", "public_works"],
  },
  {
    id: "quick_information",
    icon: LayoutDashboard,
    titleKey: "quick_information",
    subtitleKey: "quick_information_subtitle",
    href: "/quick-info",
    push: true,
    permissionModules: ["dashboard", "report"],
  },
  {
    id: "training",
    icon: GraduationCap,
    titleKey: "training",
    subtitleKey: "training_subtitle",
    href: "/(protected)/(app)/training",
    permissionModules: ["training"],
  },
  {
    id: "communication",
    icon: MessagesSquare,
    titleKey: "communication",
    subtitleKey: "communication_subtitle",
    href: "/(protected)/(app)/communication",
    permissionModules: ["communication"],
  },
  {
    id: "coordination",
    icon: CalendarRange,
    titleKey: "coordination",
    subtitleKey: "coordination_subtitle",
    href: "/(protected)/(app)/coordination",
    permissionModules: ["coordination", "training", "communication"],
  },
  {
    id: "community_session",
    icon: Users,
    titleKey: "community_session",
    subtitleKey: "community_session_subtitle",
    href: "/(protected)/(app)/community-session",
    permissionModules: ["community_session"],
  },
];

export const MODULE_TILE_IDS: ModuleTileId[] = MODULE_TILES.map((tile) => tile.id);

export const MODULE_TILE_BY_ID: Record<ModuleTileId, ModuleTileConfig> = Object.fromEntries(
  MODULE_TILES.map((tile) => [tile.id, tile]),
) as Record<ModuleTileId, ModuleTileConfig>;
