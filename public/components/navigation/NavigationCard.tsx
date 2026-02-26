"use client";

import Link from "next/link";
import { getIcon } from "@/lib/icons";

interface NavigationCardProps {
  href: string;
  icon: string;
  label: string;
  description: string;
  imageUrl?: string;
}

// Map of icon types to gradient colors for the card headers
const iconGradients: Record<string, string> = {
  home: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  dashboard: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  cart: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  "shopping-bag": "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  tags: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  dollar: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  receipt: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  banknote: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  "hand-coins": "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  landmark: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  "trending-up": "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  wallet: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  users: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  user: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  "user-plus": "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  "user-cog": "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  briefcase: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  box: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
  truck: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
  building: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
  "book-open": "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
  sitemap: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
  "file-signature": "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
  files: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
  "clipboard-check": "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
  "check-square": "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
  eye: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
  "pie-chart": "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
  "bar-chart-3": "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
  "file-search": "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
  check: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  "shield-check": "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  scale: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  settings: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
  factory: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
  hammer: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
  cpu: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
  calendar: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
  timer: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
  hourglass: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
  activity: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  repeat: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  layers: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  bell: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
};

// Abstract pattern SVGs for card headers
const patterns: Record<string, string> = {
  home: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><circle cx="160" cy="20" r="40" fill="url(#g1)"/><circle cx="30" cy="60" r="25" fill="url(#g1)"/><path d="M0 60 Q50 30 100 50 T200 40" stroke="rgba(255,255,255,0.15)" fill="none" stroke-width="2"/></svg>`,
  dashboard: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><circle cx="160" cy="20" r="40" fill="url(#g1)"/><circle cx="30" cy="60" r="25" fill="url(#g1)"/><path d="M0 60 Q50 30 100 50 T200 40" stroke="rgba(255,255,255,0.15)" fill="none" stroke-width="2"/></svg>`,
  cart: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><rect x="140" y="10" width="50" height="50" rx="10" fill="url(#g2)" transform="rotate(15 165 35)"/><rect x="20" y="40" width="30" height="30" rx="6" fill="url(#g2)" transform="rotate(-10 35 55)"/><path d="M0 70 Q60 50 120 60 T200 50" stroke="rgba(255,255,255,0.1)" fill="none" stroke-width="3"/></svg>`,
  "shopping-bag": `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><rect x="140" y="10" width="50" height="50" rx="10" fill="url(#g2)" transform="rotate(15 165 35)"/><rect x="20" y="40" width="30" height="30" rx="6" fill="url(#g2)" transform="rotate(-10 35 55)"/><path d="M0 70 Q60 50 120 60 T200 50" stroke="rgba(255,255,255,0.1)" fill="none" stroke-width="3"/></svg>`,
  dollar: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.25)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><ellipse cx="150" cy="40" rx="45" ry="35" fill="url(#g3)"/><circle cx="40" cy="25" r="20" fill="url(#g3)"/><path d="M0 50 Q40 20 80 40 T160 30 T200 45" stroke="rgba(255,255,255,0.12)" fill="none" stroke-width="2"/></svg>`,
  receipt: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.25)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><ellipse cx="150" cy="40" rx="45" ry="35" fill="url(#g3)"/><circle cx="40" cy="25" r="20" fill="url(#g3)"/><path d="M0 50 Q40 20 80 40 T160 30 T200 45" stroke="rgba(255,255,255,0.12)" fill="none" stroke-width="2"/></svg>`,
  users: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><circle cx="50" cy="40" r="30" fill="url(#g4)"/><circle cx="130" cy="30" r="25" fill="url(#g4)"/><circle cx="170" cy="55" r="18" fill="url(#g4)"/></svg>`,
  user: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><circle cx="50" cy="40" r="30" fill="url(#g4)"/><circle cx="130" cy="30" r="25" fill="url(#g4)"/><circle cx="170" cy="55" r="18" fill="url(#g4)"/></svg>`,
  box: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><polygon points="100,5 150,25 150,55 100,75 50,55 50,25" fill="url(#g5)"/><polygon points="160,20 190,35 190,60 160,75 130,60 130,35" fill="url(#g5)"/></svg>`,
  building: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><rect x="20" y="20" width="40" height="60" rx="4" fill="url(#g6)"/><rect x="80" y="10" width="50" height="70" rx="4" fill="url(#g6)"/><rect x="150" y="30" width="35" height="50" rx="4" fill="url(#g6)"/></svg>`,
  "book-open": `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><rect x="20" y="20" width="40" height="60" rx="4" fill="url(#g6)"/><rect x="80" y="10" width="50" height="70" rx="4" fill="url(#g6)"/><rect x="150" y="30" width="35" height="50" rx="4" fill="url(#g6)"/></svg>`,
  eye: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g7" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><ellipse cx="100" cy="40" rx="80" ry="30" fill="url(#g7)"/><circle cx="100" cy="40" r="20" fill="rgba(255,255,255,0.15)"/></svg>`,
  check: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g8" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><circle cx="60" cy="40" r="35" fill="url(#g8)"/><path d="M40 40 L55 55 L85 25" stroke="rgba(255,255,255,0.3)" fill="none" stroke-width="4" stroke-linecap="round"/><circle cx="150" cy="30" r="20" fill="url(#g8)"/></svg>`,
  settings: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g9" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></linearGradient></defs><circle cx="60" cy="40" r="30" fill="none" stroke="url(#g9)" stroke-width="8"/><circle cx="140" cy="35" r="25" fill="none" stroke="url(#g9)" stroke-width="6"/><circle cx="60" cy="40" r="10" fill="url(#g9)"/></svg>`,
  activity: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><path d="M0 40 L40 40 L50 20 L70 60 L80 40 L120 40 L130 15 L160 65 L170 40 L200 40" stroke="rgba(255,255,255,0.15)" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  "pie-chart": `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><circle cx="150" cy="40" r="30" fill="rgba(255,255,255,0.1)"/><path d="M150 40 L150 10 A30 30 0 0 1 180 40 Z" fill="rgba(255,255,255,0.2)"/><circle cx="40" cy="30" r="15" fill="rgba(255,255,255,0.1)"/></svg>`,
  sitemap: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><rect x="90" y="10" width="20" height="15" rx="2" fill="rgba(255,255,255,0.2)"/><path d="M100 25 L100 40 M60 40 L140 40 M60 40 L60 55 M140 40 L140 55" stroke="rgba(255,255,255,0.15)" stroke-width="2"/><rect x="50" y="55" width="20" height="15" rx="2" fill="rgba(255,255,255,0.1)"/><rect x="130" y="55" width="20" height="15" rx="2" fill="rgba(255,255,255,0.1)"/></svg>`,
  banknote: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="20" width="60" height="35" rx="4" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/><rect x="40" y="30" width="40" height="15" rx="8" fill="rgba(255,255,255,0.1)"/><rect x="120" y="25" width="50" height="30" rx="4" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/></svg>`,
};

export function NavigationCard({ href, icon, label, description }: NavigationCardProps) {
  const gradient = iconGradients[icon] || iconGradients.home;
  const pattern = patterns[icon] || patterns.home;
  const isComingSoon = description.includes("قريباً");

  return (
    <Link href={href} className="premium-nav-card">
      {/* Header with gradient and pattern */}
      <div
        className="premium-nav-card-header"
        style={{ background: gradient }}
      >
        <div
          className="premium-nav-card-pattern"
          dangerouslySetInnerHTML={{ __html: pattern }}
        />
        <div className="premium-nav-card-icon">
          {getIcon(icon)}
        </div>
        {isComingSoon && (
          <span className="premium-nav-card-badge">قريباً</span>
        )}
      </div>

      {/* Content */}
      <div className="premium-nav-card-body">
        <h3 className="premium-nav-card-title">{label}</h3>
        <p className="premium-nav-card-description">
          {description.replace(" (قريباً)", "")}
        </p>
      </div>

      {/* Footer with arrow */}
      <div className="premium-nav-card-footer">
        <span className="premium-nav-card-action">
          {isComingSoon ? "عرض التفاصيل" : "الانتقال"}
        </span>
        <div className="premium-nav-card-arrow">
          {getIcon("chevron-right")}
        </div>
      </div>
    </Link>
  );
}
