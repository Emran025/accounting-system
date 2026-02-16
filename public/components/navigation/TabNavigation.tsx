"use client";

import { useState, useRef, useEffect } from "react";

export interface Tab {
  key: string;
  label: string;
  icon: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  className?: string;
}

// Mobile Tab Dropdown Component
function MobileTabDropdown({
  tabs,
  activeTab,
  onTabChange
}: {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (tabKey: string) => {
    onTabChange(tabKey);
    setIsOpen(false);
  };

  const currentTab = tabs.find(t => t.key === activeTab) || tabs[0];

  return (
    <div className="mobile-tab-container">
      <div className={`custom-dropdown ${isOpen ? "active" : ""}`}>
        <button
          className="dropdown-trigger"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{currentTab?.label || tabs[0]?.label}</span>
          <i className={`fas fa-chevron-down trigger-icon`}></i>
        </button>
        <div className="dropdown-menu">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={`dropdown-item ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => handleSelect(tab.key)}
            >
              <i className={`fas ${tab.icon}`}></i> {tab.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TabNavigation({ tabs, activeTab, onTabChange, className = "" }: TabNavigationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Check scroll position to toggle arrows
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const isRTL = document.dir === "rtl" || document.documentElement.dir === "rtl" || document.documentElement.style.direction === "rtl";

      const scrollableWidth = scrollWidth - clientWidth;
      const tolerance = 2;

      if (scrollableWidth <= 0) {
        setShowLeftArrow(false);
        setShowRightArrow(false);
        return;
      }

      if (isRTL) {
        // In RTL, scrollLeft is usually negative or 0
        // Right Arrow (towards 0/Start): show if we are scrolled left (negative)
        setShowRightArrow(scrollLeft < -tolerance);
        // Left Arrow (towards -max/End): show if we are not at end
        setShowLeftArrow(scrollLeft > -(scrollableWidth - tolerance));
      } else {
        // LTR
        setShowLeftArrow(scrollLeft > tolerance);
        setShowRightArrow(scrollLeft < scrollableWidth - tolerance);
      }
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [tabs]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <div className={`settings-tabs ${className}`}>
      {/* Mobile Dropdown */}
      <MobileTabDropdown
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {/* Desktop Scrollable Tabs */}
      <div className="desktop-tabs-wrapper">
        <button
          className={`scroll-btn right ${showRightArrow ? "visible" : "hidden"}`}
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          type="button"
        >
          <i className="fas fa-chevron-right"></i>
        </button>

        <div
          className="scroll-track"
          ref={scrollRef}
          onScroll={checkScroll}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => onTabChange(tab.key)}
            >
              <i className={`fas ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>
        <button
          className={`scroll-btn left ${showLeftArrow ? "visible" : "hidden"}`}
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          type="button"
        >
          <i className="fas fa-chevron-left"></i>
        </button>
      </div>
    </div>
  );
}
