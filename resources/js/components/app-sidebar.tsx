import { Upload, Table, RefreshCw, Download } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import { useState } from 'react';
import type { NavItem } from '@/types';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

const screenItems: { title: string; screen: string; icon: typeof Upload }[] = [
    {
        title: 'Upload',
        screen: 'upload',
        icon: Upload,
    },
    {
        title: 'Mapping',
        screen: 'mapping',
        icon: Table,
    },
    {
        title: 'Processing',
        screen: 'processing',
        icon: RefreshCw,
    },
    {
        title: 'Export',
        screen: 'export',
        icon: Download,
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const [currentScreen, setCurrentScreen] = useState('upload');

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg">
                            <AppLogo />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarMenu>
                    {screenItems.map((item) => (
                        <SidebarMenuItem key={item.screen}>
                            <SidebarMenuButton
                                isActive={currentScreen === item.screen}
                                tooltip={{ children: item.title }}
                                onClick={() => setCurrentScreen(item.screen)}
                            >
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
