import { getIcon } from "@/lib/icons";

export interface ContextMenuPortalProps {
    x: number;
    y: number;
    type: "screen" | "folder";
    path: string;
    isFavorite: boolean;
    onAddFavorite: () => void;
    onRemoveFavorite: () => void;
    onOpen: () => void;
    onClose: () => void;
}

export function ContextMenuPortal({
    x,
    y,
    type,
    path,
    isFavorite,
    onAddFavorite,
    onRemoveFavorite,
    onOpen,
    onClose,
}: ContextMenuPortalProps) {
    return (
        <div
            className="sidenav-context-menu"
            style={{ top: y, left: x }}
            onClick={(e) => e.stopPropagation()}
        >
            {type === "screen" && (
                <button
                    className="sidenav-context-item"
                    onClick={() => { onOpen(); onClose(); }}
                >
                    {getIcon("chevron-right")}
                    <span>Open</span>
                </button>
            )}
            {type === "screen" && (
                !isFavorite ? (
                    <button
                        className="sidenav-context-item"
                        onClick={() => { onAddFavorite(); onClose(); }}
                    >
                        {getIcon("star")}
                        <span>Add to Favorites</span>
                    </button>
                ) : (
                    <button
                        className="sidenav-context-item danger"
                        onClick={() => { onRemoveFavorite(); onClose(); }}
                    >
                        {getIcon("x")}
                        <span>Remove from Favorites</span>
                    </button>
                )
            )}
        </div>
    );
}
