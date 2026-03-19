import { Search, Bell, Moon, Sun, User, LogOut, Settings, ChevronDown, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function TopBar() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 lg:px-6 bg-card/80 backdrop-blur-sm border-b border-border">
      {/* Search */}
      <div className="relative w-64 lg:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search deals, reps, properties…"
          className="pl-9 h-9 bg-muted/50 border-0 text-sm focus-visible:ring-1"
        />
      </div>

      <div className="flex items-center gap-1.5">
        {/* Date range selector */}
        <Select defaultValue="this-month">
          <SelectTrigger className="h-9 w-36 text-xs border-0 bg-muted/50 gap-1.5 hidden md:flex">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="this-quarter">This Quarter</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDark(!dark)}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-card" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b">
              <h4 className="text-sm font-semibold">Notifications</h4>
            </div>
            <div className="p-2 space-y-1">
              {[
                { title: 'Draw request pending', desc: 'Nicole Foster requested $1,500 draw', time: '2m ago' },
                { title: 'Deal funded', desc: '2100 Cedar Creek Blvd closed successfully', time: '1h ago' },
                { title: 'KPI deadline', desc: 'Weekly KPI entries due by end of day', time: '3h ago' },
              ].map((n, i) => (
                <div key={i} className="flex gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t">
              <Button variant="ghost" size="sm" className="w-full text-xs">View all notifications</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <div className="ml-1.5 pl-3 border-l border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity outline-none">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  MJ
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium leading-none">Marcus Johnson</p>
                  <p className="text-xs text-muted-foreground">Admin</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">Marcus Johnson</p>
                  <p className="text-xs text-muted-foreground font-normal">marcus@presidentialdigs.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
