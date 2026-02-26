"use client";

export function GlobalMenus() {
    return (
        <nav className="top-global-menus" aria-label="Global menus">
            <button className="top-global-menu-btn" type="button">
                <span className="top-global-menu-label">القائمة</span>
            </button>
            <button className="top-global-menu-btn" type="button">
                <span className="top-global-menu-label">التعديل</span>
            </button>
            <button className="top-global-menu-btn" type="button">
                <span className="top-global-menu-label">الإضافات</span>
            </button>
            <button className="top-global-menu-btn" type="button">
                <span className="top-global-menu-label">النظام</span>
            </button>
            <button className="top-global-menu-btn" type="button">
                <span className="top-global-menu-label">المساعدة</span>
            </button>
        </nav>
    );
}
