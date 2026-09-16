// src/config/navConfig.ts
import {
  Building2,
  ClipboardCheck,
  FileCheck,
  FileText,
  Globe,
  LayoutDashboard,
  UserCog,
  Landmark,
  type LucideIcon,
  BotIcon,
  Workflow,
  SlidersHorizontal,
  Activity,
} from "lucide-react"

export interface NavItemConfig {
  label: string
  icon: LucideIcon
  path: string
  accessRoles: string[]
  systemRoles: string[]
}

export interface NavSectionConfig {
  id: string
  /** Heading shown above the group; null renders the items with no heading */
  heading: string | null
  items: NavItemConfig[]
}

export const NAV_SECTIONS: NavSectionConfig[] = [
  {
    id: "overview",
    heading: null,
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/dashboard",
        accessRoles: ["admin", "user", "manager", "lead", "engineer", "viewer"],
        systemRoles: ["system admin", "system manager", "system viewer", "ai directory curator", "buyer", "vendor"],
      },
      {
        label: "AI Vendor Directory",
        icon: Building2,
        path: "/vendor-directory",
        accessRoles: ["admin", "manager", "lead", "engineer", "viewer"],
        systemRoles: ["system admin", "system manager", "system viewer", "ai directory curator", "buyer"],
      },
      {
        label: "Product Profile",
        icon: Globe,
        path: "/product_profile",
        accessRoles: ["admin", "user", "manager", "lead", "engineer", "viewer"],
        systemRoles: ["system admin", "system manager", "system viewer", "vendor"],
      },
    ],
  },
  {
    id: "governance",
    heading: "Governance",
    items: [
      {
        label: "Attestation",
        icon: FileCheck,
        path: "/attestation_details",
        accessRoles: ["admin", "user", "manager", "lead"],
        systemRoles: ["system admin", "system manager", "system viewer", "ai directory curator", "vendor"],
      },
      {
        label: "Assessments",
        icon: ClipboardCheck,
        path: "/assessments",
        accessRoles: ["admin", "user", "manager", "lead", "engineer", "viewer"],
        systemRoles: ["system admin", "system manager", "system viewer", "buyer", "vendor"],
      },
      
      {
        label: "Risk Mapping",
        icon: Workflow,
        path: "/riskMappings",
        accessRoles: ["admin", "manager", "lead", "engineer"],
        systemRoles: ["system admin", "system manager", "system viewer", "buyer", "vendor"],
      },
    
      // {
      //   label: "Security Center",
      //   icon: Shield,
      //   path: "/security_center",
      //   accessRoles: ["admin"],
      //   systemRoles: ["system admin", "buyer"],
      // },
      // {
      //   label: "Testing",
      //   icon: TestTube,
      //   path: "/governance",
      //   accessRoles: ["admin"],
      //   systemRoles: ["system admin", "buyer"],
      // },
    ],
  },
  {
    id: "insights",
    heading: "Insights",
    items: [
      {
        label: "Reports",
        icon: FileText,
        path: "/reports",
        accessRoles: ["admin", "manager", "lead", "engineer", "viewer"],
        systemRoles: ["system admin", "system manager", "system viewer", "buyer", "vendor"],
      },
      {
        label: "Sales Agent",
        icon: BotIcon,
        path: "/salesEnablement",
        accessRoles: ["admin", "manager", "lead", "engineer"],
        systemRoles: ["system admin", "vendor"],
      },
      // ** Not needed for the Phase-1
      // {
      //   label: "Solutions Architect",
      //   icon: Layers,
      //   path: "/evidence-library",
      //   accessRoles: ["admin"],
      //   systemRoles: ["system admin", "vendor"],
      // },
    ],
  },
  {
    id: "administration",
    heading: "Admin",
    items: [
       {
        label: "Controls",
        icon: SlidersHorizontal,
        path: "/controls",
        accessRoles: ["admin"],
        systemRoles: ["system admin"],
      },
      {
        label: "Observability",
        icon: Activity,
        path: "/observability",
        accessRoles: ["admin"],
        systemRoles: ["system admin"],
      },
      {
        label: "Organizations",
        icon: Landmark,
        path: "/organizations",
        accessRoles: ["admin"],
        systemRoles: ["system admin", "system manager", "system viewer"],
      },
      
      {
        label: "User Management",
        icon: UserCog,
        path: "/userManagement",
        accessRoles: ["admin", "manager"],
        systemRoles: ["system admin", "system manager", "system viewer", "buyer", "vendor"],
      },
       
    ],
  },
]

export const NAVIGATION = {
  admin: NAV_SECTIONS.flatMap((section) => section.items),
}
