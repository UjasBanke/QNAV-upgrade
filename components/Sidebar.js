"use client";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  LayoutDashboard,
  Plane,
  MapPin,
  Atom,
  LineChart,
  BrainCircuit,
  Download,
  Sparkles,
  X,
} from "lucide-react";


export const MODULES = [

  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },

  {
    id: "vehicle",
    label: "Vehicle & Trajectory",
    icon: Plane,
  },

  {
    id: "location",
    label: "Location & Map",
    icon: MapPin,
  },

  {
    id: "ensemble",
    label: "Sensor Ensemble",
    icon: Atom,
  },

  {
    id: "analysis",
    label: "Analysis",
    icon: LineChart,
  },

  {
    id: "position",
    label: "Position Estimation",
    icon: BrainCircuit,
  },

  {
    id: "mlupgrade",
    label: "AI Model Upgrade",
    icon: Sparkles,
  },

  {
    id: "export",
    label: "Data Export",
    icon: Download,
  },

];


function NavList({
  active,
  onSelect,
}) {

  return (

    <nav className="space-y-1">

      {MODULES.map((m) => {

        const Icon = m.icon;

        const isActive =
          active === m.id;


        return (

          <button
            key={m.id}
            onClick={() =>
              onSelect(m.id)
            }
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative overflow-hidden ${
              isActive
                ? "bg-cyan/10 text-cyan border border-cyan/25 shadow-glow"
                : "text-gray-600 hover:text-gray-900 hover:bg-slate-900/5 border border-transparent"
            }`}
          >

            {isActive && (

              <motion.div
                layoutId="active-nav-bar"
                className="absolute left-0 top-0 bottom-0 w-[3px] bg-cyan"
              />

            )}


            <Icon
              size={17}
              strokeWidth={
                isActive
                  ? 2.2
                  : 1.8
              }
            />


            <span
              className={
                isActive
                  ? "font-medium"
                  : ""
              }
            >
              {m.label}
            </span>

          </button>

        );

      })}

    </nav>

  );

}


export default function Sidebar({
  active,
  onSelect,
  mobileOpen,
  setMobileOpen,
}) {

  return (

    <>

      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-panel2/70 backdrop-blur-sm px-3 py-5 sticky top-0 h-screen overflow-y-auto">

        <SidebarHeader />

        <NavList
          active={active}
          onSelect={onSelect}
        />

        <SidebarFooter />

      </aside>


      <AnimatePresence>

        {mobileOpen && (

          <>

            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              onClick={() =>
                setMobileOpen(
                  false
                )
              }
              className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
            />


            <motion.aside
              initial={{
                x: -280,
              }}
              animate={{
                x: 0,
              }}
              exit={{
                x: -280,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 32,
              }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-panel2 border-r border-border z-50 px-3 py-5 overflow-y-auto lg:hidden"
            >

              <div className="flex items-center justify-between mb-4">

                <SidebarHeader
                  compact
                />

                <button
                  onClick={() =>
                    setMobileOpen(
                      false
                    )
                  }
                  className="text-gray-400 p-1"
                >

                  <X size={20} />

                </button>

              </div>


              <NavList
                active={active}
                onSelect={(id) => {

                  onSelect(id);

                  setMobileOpen(
                    false
                  );

                }}
              />


              <SidebarFooter />

            </motion.aside>

          </>

        )}

      </AnimatePresence>

    </>

  );

}


function SidebarHeader({
  compact,
}) {

  if (compact) {

    return (

      <div className="flex items-center gap-2">

        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan to-violet flex items-center justify-center text-white font-bold text-sm">
          ⬡
        </div>

        <span className="font-bold text-sm tracking-wide">
          NV NAV
        </span>

      </div>

    );

  }


  return (

    <div className="mb-6 px-1">

      <div className="flex items-center gap-2.5 mb-1">

        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan to-violet flex items-center justify-center text-white font-bold shadow-glow">
          ⬡
        </div>


        <div>

          <div className="font-bold text-sm tracking-wide leading-tight">
            NV NAV
          </div>

          <div className="text-[10px] text-gray-500 leading-tight">
            Quantum Navigation Console
          </div>

        </div>

      </div>

    </div>

  );

}


function SidebarFooter() {

  return (

    <div className="mt-auto pt-6 px-2">

      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">

        <span className="w-1.5 h-1.5 rounded-full bg-accentGreen pulse-dot" />

        Live simulation engine

      </div>

    </div>

  );

}