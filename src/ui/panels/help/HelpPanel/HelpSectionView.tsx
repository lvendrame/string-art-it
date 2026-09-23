import type { TFunction } from "i18next";
import type { HelpSection } from "@ui/panels/help/helpContent";
import "./HelpSectionView.css";

export function HelpSectionView({ section, t }: { section: HelpSection; t: TFunction<["help", "common"]> }) {
  return (
    <div>
      {section.headingKey && <div className="help-panel__section-heading">{t(section.headingKey)}</div>}
      <div className="help-panel__section-items">
        {section.items.map((item) => (
          <div key={item.labelKey} className="help-panel__section-item">
            <span className="help-panel__section-item-label">{t(item.labelKey)}</span>
            <span className="help-panel__section-item-description">{t(item.descriptionKey)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
