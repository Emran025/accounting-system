// React Icons - Using Lucide React
import React from 'react';
import { 
    Plus, SquarePen, Trash2, Eye, Check, Printer, Box, Download, ShoppingCart, 
    LogOut, X, CircleAlert, Home, Users, User, ChevronUp, ChevronDown, 
    ChevronRight, Settings, DollarSign, Building2, Lock, Unlock, 
    RefreshCw, Minus, History, Search, Clock, CircleCheck, List, 
    ClipboardList, ChartBar, ChartLine, Wallet, Coins, HandHelping
} from 'lucide-react';

interface IconProps {
    className?: string;
    size?: number;
    strokeWidth?: number;
}

export const icons = {
    plus: (props: IconProps) => <Plus className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    edit: (props: IconProps) => <SquarePen className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    trash: (props: IconProps) => <Trash2 className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    eye: (props: IconProps) => <Eye className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    check: (props: IconProps) => <Check className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    print: (props: IconProps) => <Printer className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    box: (props: IconProps) => <Box className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    download: (props: IconProps) => <Download className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    cart: (props: IconProps) => <ShoppingCart className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    logout: (props: IconProps) => <LogOut className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    x: (props: IconProps) => <X className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    alert: (props: IconProps) => <CircleAlert className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    home: (props: IconProps) => <Home className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    users: (props: IconProps) => <Users className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    user: (props: IconProps) => <User className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    chevronUp: (props: IconProps) => <ChevronUp className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    chevronDown: (props: IconProps) => <ChevronDown className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    chevronRight: (props: IconProps) => <ChevronRight className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    settings: (props: IconProps) => <Settings className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    dollar: (props: IconProps) => <DollarSign className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    building: (props: IconProps) => <Building2 className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    lock: (props: IconProps) => <Lock className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    unlock: (props: IconProps) => <Unlock className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    refresh: (props: IconProps) => <RefreshCw className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    minus: (props: IconProps) => <Minus className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    history: (props: IconProps) => <History className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    search: (props: IconProps) => <Search className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    clock: (props: IconProps) => <Clock className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "check-circle": (props: IconProps) => <CircleCheck className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    list: (props: IconProps) => <List className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "clipboard-list": (props: IconProps) => <ClipboardList className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "chart-bar": (props: IconProps) => <ChartBar className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "chart-line": (props: IconProps) => <ChartLine className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    wallet: (props: IconProps) => <Wallet className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    coins: (props: IconProps) => <Coins className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "hand-holding": (props: IconProps) => <HandHelping className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
};

export type IconName = keyof typeof icons;

interface GetIconProps {
    name: IconName;
    className?: string;
    size?: number;
    strokeWidth?: number;
}

export function Icon({ name, className, size, strokeWidth }: GetIconProps) {
    const IconComponent = icons[name];
    if (!IconComponent) return null;
    return <IconComponent className={className} size={size} strokeWidth={strokeWidth} />;
}

// Helper function to get icon by name string
export function getIcon(name: string, className?: string, size?: number, strokeWidth?: number): React.ReactNode {
    const IconComponent = icons[name as IconName];
    if (!IconComponent) return null;
    return <IconComponent className={className} size={size} strokeWidth={strokeWidth} />;
}

export default icons;
