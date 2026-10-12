import {
  Bell,
  BriefcaseBusiness,
  Building2,
  FileText,
  Gauge,
  House,
  Scale,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type ScopeKey = "legal" | "real-estate";
export interface ScopeNavigationItem {
  label: string;
  section?: string;
  icon: LucideIcon;
}
export interface ScopeConfig {
  key: ScopeKey;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  accentSoft: string;
  accentDeep: string;
  navigation: ScopeNavigationItem[];
}

export const scopes: Record<ScopeKey, ScopeConfig> = {
  legal: {
    key: "legal",
    eyebrow: "Jurídico",
    title: "Visão jurídica",
    description: "Processos, prazos e relacionamento com clientes.",
    accent: "#4F5D3A",
    accentSoft: "#edf1e8",
    accentDeep: "#344027",
    navigation: [
      { label: "Visão geral", icon: Gauge },
      { label: "Clientes", section: "people", icon: Users },
      { label: "Processos", section: "cases", icon: BriefcaseBusiness },
      { label: "Documentos", section: "documents", icon: FileText },
      { label: "Notificações", section: "notifications", icon: Bell },
    ],
  },
  "real-estate": {
    key: "real-estate",
    eyebrow: "Imobiliário",
    title: "Visão imobiliária",
    description: "Imóveis, contratos e rotina de locações.",
    accent: "#7A263A",
    accentSoft: "#f8ecef",
    accentDeep: "#561829",
    navigation: [
      { label: "Visão geral", icon: Gauge },
      { label: "Pessoas", section: "people", icon: Users },
      { label: "Imóveis", section: "properties", icon: House },
      { label: "Contratos", section: "contracts", icon: FileText },
      { label: "Manutenção", section: "maintenance", icon: Wrench },
      { label: "Notificações", section: "notifications", icon: Bell },
    ],
  },
};

export function isScopeKey(value: string): value is ScopeKey {
  return value === "legal" || value === "real-estate";
}
export function otherScope(scope: ScopeKey): ScopeConfig {
  return scope === "legal" ? scopes["real-estate"] : scopes.legal;
}
export const scopeIcon: Record<ScopeKey, LucideIcon> = {
  legal: Scale,
  "real-estate": Building2,
};
