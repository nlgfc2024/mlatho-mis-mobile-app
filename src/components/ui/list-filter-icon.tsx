import { ListFilter } from "lucide-react-native";

type ListFilterIconProps = {
  color: string;
  size?: number;
};

export default function ListFilterIcon({ color, size = 18 }: ListFilterIconProps) {
  return <ListFilter size={size} color={color} strokeWidth={2.2} />;
}
