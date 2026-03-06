"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="h-8 w-8"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </header>
  );
}
