// React Icons - Using Lucide React
import React from 'react';
import {
    Mail, Plus, SquarePen, Trash2, Eye, Check, Printer, Box, Download, ShoppingCart,
    LogOut, X, CircleAlert, Home, Users, User, ChevronUp, ChevronDown,
    ChevronRight, Settings, DollarSign, Building2, Lock, Unlock,
    RefreshCw, Minus, History, Search, Clock, CircleCheck, List,
    ClipboardList, ChartBar, ChartLine, Wallet, Coins, HandHelping,
    TrendingUp, Receipt, CreditCard, Banknote, UserPlus, BookOpen,
    Network, FileSignature, Calendar, Timer, Scale, Activity,
    Repeat, Layers, Truck, HandCoins, ShoppingBag, PieChart,
    ShieldCheck, Landmark, BarChart3, UserCog, Bell, FileSearch,
    Tags, Ruler, Factory, Files, Hammer, Cpu, ClipboardCheck,
    Briefcase, CheckSquare, Hourglass, LayoutDashboard, Save, Calculator,
    FileText, FileCheck, Scroll, Globe, Laptop, Book, HardHat, HeartPulse, Link,
    CalendarDays, UserCheck, Plane, Megaphone, GraduationCap, Heart
} from 'lucide-react';

interface IconProps {
    className?: string;
    size?: number;
    strokeWidth?: number;
}

export const icons = {
    mail: (props: IconProps) => <Mail className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
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
    "trending-up": (props: IconProps) => <TrendingUp className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    receipt: (props: IconProps) => <Receipt className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "credit-card": (props: IconProps) => <CreditCard className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    banknote: (props: IconProps) => <Banknote className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "user-plus": (props: IconProps) => <UserPlus className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "book-open": (props: IconProps) => <BookOpen className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    sitemap: (props: IconProps) => <Network className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "file-signature": (props: IconProps) => <FileSignature className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    calendar: (props: IconProps) => <Calendar className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    timer: (props: IconProps) => <Timer className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    scale: (props: IconProps) => <Scale className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    activity: (props: IconProps) => <Activity className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    repeat: (props: IconProps) => <Repeat className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    layers: (props: IconProps) => <Layers className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    truck: (props: IconProps) => <Truck className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "hand-coins": (props: IconProps) => <HandCoins className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "shopping-bag": (props: IconProps) => <ShoppingBag className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "pie-chart": (props: IconProps) => <PieChart className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "shield-check": (props: IconProps) => <ShieldCheck className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    landmark: (props: IconProps) => <Landmark className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "bar-chart-3": (props: IconProps) => <BarChart3 className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "user-cog": (props: IconProps) => <UserCog className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    bell: (props: IconProps) => <Bell className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "file-search": (props: IconProps) => <FileSearch className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    tags: (props: IconProps) => <Tags className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    ruler: (props: IconProps) => <Ruler className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    factory: (props: IconProps) => <Factory className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    files: (props: IconProps) => <Files className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    hammer: (props: IconProps) => <Hammer className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    cpu: (props: IconProps) => <Cpu className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "clipboard-check": (props: IconProps) => <ClipboardCheck className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    briefcase: (props: IconProps) => <Briefcase className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "check-square": (props: IconProps) => <CheckSquare className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    hourglass: (props: IconProps) => <Hourglass className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    dashboard: (props: IconProps) => <LayoutDashboard className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    save: (props: IconProps) => <Save className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    times: (props: IconProps) => <X className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "calendar-alt": (props: IconProps) => <Calendar className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    calculator: (props: IconProps) => <Calculator className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    cog: (props: IconProps) => <Settings className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "user-circle": (props: IconProps) => <User className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "chevron-right": (props: IconProps) => <ChevronRight className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "chevron-down": (props: IconProps) => <ChevronDown className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "file-contract": (props: IconProps) => <FileText className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "file-check": (props: IconProps) => <FileCheck className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "scroll": (props: IconProps) => <Scroll className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    globe: (props: IconProps) => <Globe className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    laptop: (props: IconProps) => <Laptop className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    book: (props: IconProps) => <Book className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "hard-hat": (props: IconProps) => <HardHat className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "heart-pulse": (props: IconProps) => <HeartPulse className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    link: (props: IconProps) => <Link className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "calendar-days": (props: IconProps) => <CalendarDays className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "user-check": (props: IconProps) => <UserCheck className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    plane: (props: IconProps) => <Plane className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "hand-holding-usd": (props: IconProps) => <HandCoins className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    bullhorn: (props: IconProps) => <Megaphone className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "graduation-cap": (props: IconProps) => <GraduationCap className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "money-bill-wave": (props: IconProps) => <Banknote className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    heart: (props: IconProps) => <Heart className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
    "users-gear": (props: IconProps) => <UserCog className={`icon ${props.className || ''}`} size={props.size} strokeWidth={props.strokeWidth} />,
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
