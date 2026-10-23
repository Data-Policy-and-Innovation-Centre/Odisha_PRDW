import { Landmark } from "lucide-react";

export type Mode = "ask" | "discover" | "catalogue";

interface AppHeaderProps {
  activeView: Mode;
  onViewChange: (view: Mode) => void;
}

// Track (the choropleth explorer) is a deliberate omission, not an oversight:
// it is a separate workstream and gets its own phase.
const navItems: { id: Mode; label: string }[] = [
  { id: "ask", label: "Ask" },
  { id: "discover", label: "Discover" },
  { id: "catalogue", label: "Catalogue" },
];

export function AppHeader({ activeView, onViewChange }: AppHeaderProps) {
  return (
    <header className="h-14 border-b border-line bg-white flex items-center justify-between px-6 sticky top-0 z-10 gap-6">
      {/* Brand - fully visible without any truncation or abbreviation */}
      <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
        <div className="w-7 h-7 rounded-sm bg-teal-deep flex items-center justify-center shrink-0">
          <Landmark size={15} className="text-ivory" strokeWidth={2.25} />
        </div>
        <div className="leading-tight shrink-0">
          <div className="font-display text-[15px] font-medium tracking-tight whitespace-nowrap">
            PR&amp;DW Decision Aid
          </div>
        </div>
        <div className="w-px h-5 bg-line mx-3 shrink-0" />
        <div className="text-xs text-muted-design shrink-0 whitespace-nowrap">
          <span className="font-medium text-ink/70">Odisha</span>
          <span className="mx-1.5 text-line">·</span>
          <span>Panchayati Raj &amp; Drinking Water Department</span>
        </div>
      </div>

      {/* Segmented nav */}
      <nav
        role="tablist"
        aria-label="Main Navigation"
        className="flex items-center gap-0.5 bg-ivory border border-line rounded-lg p-1 shrink-0"
      >
        {navItems.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={active}
              onClick={() => onViewChange(item.id)}
              className={`px-4 py-1.5 text-sm rounded-md transition-all whitespace-nowrap ${
                active
                  ? "bg-white text-ink font-medium shadow-sm border border-line"
                  : "text-muted-design hover:text-ink hover:bg-white/60"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
