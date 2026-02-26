// lib/nav.ts
import {
  Squares2X2Icon,
  ArrowsRightLeftIcon,
  ClockIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";

export const NAV = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: Squares2X2Icon },
      { label: "Compare", href: "/", icon: ArrowsRightLeftIcon },
      { label: "History", href: "/history", icon: ClockIcon },
    ],
  },
] as const;

