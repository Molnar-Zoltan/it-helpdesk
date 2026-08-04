export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  /** Accessible name for the tablist, e.g. "Account settings sections". */
  label: string;
}
