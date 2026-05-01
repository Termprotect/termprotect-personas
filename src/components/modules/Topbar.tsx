"use client";

import { Bell, LogOut, User } from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { SearchBar } from "./search-bar";
import { Pulse } from "./pulse";
import { DayNightSwitch } from "./day-night-switch";

interface TopbarProps {
  nombres: string;
  apellidos: string;
  role: string;
}

export default function Topbar({ nombres, apellidos, role }: TopbarProps) {
  void role;
  return (
    <header
      className="sticky top-0 z-20 h-14 border-b border-line-2 backdrop-blur"
      style={{
        background: "color-mix(in srgb, var(--bg) 86%, transparent)",
      }}
    >
      <div className="h-full flex items-center gap-4 px-5">
        <Breadcrumbs />

        <div className="ml-2">
          <SearchBar />
        </div>

        <div className="flex-1" />

        <Pulse />

        <button
          type="button"
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-line transition-colors"
          aria-label="Notificaciones"
          title="Notificaciones"
        >
          <Bell className="w-[15px] h-[15px]" />
        </button>

        <DayNightSwitch />

        <div className="flex items-center gap-2 pl-2 border-l border-line-2">
          <div className="text-right">
            <div className="text-[12px] font-medium leading-none text-ink">
              {nombres} {apellidos}
            </div>
          </div>
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-accent/15">
            <User className="w-4 h-4 text-accent" aria-hidden />
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/signout?callbackUrl=/login";
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-bad hover:bg-bad/10 transition-colors"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
