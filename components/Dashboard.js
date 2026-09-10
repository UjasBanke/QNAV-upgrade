"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  CheckCircle2,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";

import {
  runFullSimulation,
  buildGeometry,
  computeNoiseBudget,
} from "../lib/simulation";

import {
  rowsToCsv,
  downloadCsv,
} from "../lib/csv";

import {
  VEHICLE_PRESETS,
} from "../lib/vehiclePresets";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

import OverviewModule from "./modules/OverviewModule";
import VehicleModule from "./modules/VehicleModule";
import LocationModule from "./modules/LocationModule";
import EnsembleModule from "./modules/EnsembleModule";
import AnalysisModule from "./modules/AnalysisModule";
import EstimationModule from "./modules/EstimationModule";
import ExportModule from "./modules/ExportModule";
import MLUpgradeModule from "./modules/MLUpgradeModule";

import { SimulationProvider } from "./context/SimulationContext";
const DEFAULT_PARAMS = {
  vehicleType: "aircraft",
  speed: 120,
  startAlt: 3000,
  climbRate: 5,
  turnRate: 2,
  altMin: 0,
  altMax: 12000,
  startLat: 23.0225,
  startLon: 72.5714,
  startDate: "2026-01-01",
  startTime: "00:00",
  duration: 600,
  dt: 1,
  nDiamonds: 4,
  anomalyAmplitude: 150,
  correlationLength: 30,
  anomalySeed: 42,
  integrationTimeS: 10,
  noiseSeed: 123,
};


let wpCounter = 1;


export default function Dashboard() {

  const [
    activeModule,
    setActiveModule,
  ] = useState("overview");

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);


  const [
    draftParams,
    setDraftParams,
  ] = useState(
    DEFAULT_PARAMS
  );

  const [
    appliedParams,
    setAppliedParams,
  ] = useState(
    DEFAULT_PARAMS
  );


  const [
    waypoints,
    setWaypoints,
  ] = useState([]);

  const [
    activeWaypointId,
    setActiveWaypointId,
  ] = useState(null);

  const [
    viewMode,
    setViewMode,
  ] = useState("world");


  const isDirty = useMemo(
    () =>
      JSON.stringify(
        draftParams
      ) !==
      JSON.stringify(
        appliedParams
      ),
    [
      draftParams,
      appliedParams,
    ]
  );


  const applyParams = () =>
    setAppliedParams(
      draftParams
    );


  const discardParams = () =>
    setDraftParams(
      appliedParams
    );


  const addWaypoint = (
    lat,
    lon
  ) => {

    const id =
      wpCounter++;


    setWaypoints(
      (wps) => [
        ...wps,
        {
          id,
          lat,
          lon,
        },
      ]
    );


    setActiveWaypointId(
      id
    );


    if (
      waypoints.length === 0
    ) {

      setDraftParams(
        (p) => ({
          ...p,
          startLat: lat,
          startLon: lon,
        })
      );

      setAppliedParams(
        (p) => ({
          ...p,
          startLat: lat,
          startLon: lon,
        })
      );

    }

  };


  const updateWaypoint = (
    id,
    lat,
    lon
  ) => {

    setWaypoints(
      (wps) =>
        wps.map(
          (w) =>
            w.id === id
              ? {
                  ...w,
                  lat,
                  lon,
                }
              : w
        )
    );

  };


  const removeWaypoint = (
    id
  ) => {

    setWaypoints(
      (wps) =>
        wps.filter(
          (w) =>
            w.id !== id
        )
    );


    if (
      activeWaypointId === id
    ) {

      setActiveWaypointId(
        null
      );

    }

  };


  const sim = useMemo(
    () => {

      const preset =
        VEHICLE_PRESETS[
          appliedParams.vehicleType
        ];


      return runFullSimulation({
        ...appliedParams,

        allowClimb:
          preset.allowClimb,

        waypoints:
          waypoints.length >= 2
            ? waypoints.map(
                (w) => ({
                  lat: w.lat,
                  lon: w.lon,
                })
              )
            : undefined,

      });

    },
    [
      appliedParams,
      waypoints,
    ]
  );


  const {
    rows,
    geometry,
    noiseBudget,
    trajectoryMeta,
  } = sim;

  const simulationState = {
    vehicleType: appliedParams.vehicleType,
    speed: appliedParams.speed,
    altitude: appliedParams.startAlt,

    latitude: appliedParams.startLat,
    longitude: appliedParams.startLon,

    waypoints,

    diamondCount: appliedParams.nDiamonds,
    noise: noiseBudget.stdTesla,

    params: appliedParams,
    noiseBudget,

    rows,
    geometry,
    trajectoryMeta,
  };


  const draftGeometry =
    useMemo(
      () =>
        buildGeometry(
          draftParams.nDiamonds
        ),
      [
        draftParams.nDiamonds,
      ]
    );


  const draftNoiseBudget =
    useMemo(
      () =>
        computeNoiseBudget(
          draftParams.integrationTimeS
        ),
      [
        draftParams.integrationTimeS,
      ]
    );


  const [
    showApplied,
    setShowApplied,
  ] = useState(false);


  const [
    mounted,
    setMounted,
  ] = useState(false);


  useEffect(() => {

    if (!mounted) {

      setMounted(true);

      return;

    }


    setShowApplied(
      true
    );


    const id =
      setTimeout(
        () =>
          setShowApplied(
            false
          ),
        1300
      );


    return () =>
      clearTimeout(
        id
      );

  }, [
    sim,
  ]);


  const handleDownload = () => {

    const csv =
      rowsToCsv(
        rows,
        appliedParams.nDiamonds
      );


    downloadCsv(
      `nv_ensemble_${appliedParams.vehicleType}_${appliedParams.nDiamonds}diamonds.csv`,
      csv
    );

  };


  const resetAll = () => {

    setDraftParams(
      DEFAULT_PARAMS
    );

    setAppliedParams(
      DEFAULT_PARAMS
    );

    setWaypoints([]);

    setActiveWaypointId(
      null
    );

  };


  const moduleProps = {

    overview: (
      <OverviewModule
        params={
          appliedParams
        }
        rows={rows}
        geometry={
          geometry
        }
        noiseBudget={
          noiseBudget
        }
        trajectoryMeta={
          trajectoryMeta
        }
        onNavigate={
          setActiveModule
        }
      />
    ),


    vehicle: (
      <VehicleModule
        params={
          draftParams
        }
        setParams={
          setDraftParams
        }
      />
    ),


    location: (
      <LocationModule
        waypoints={
          waypoints
        }
        activeWaypointId={
          activeWaypointId
        }
        setActiveWaypointId={
          setActiveWaypointId
        }
        addWaypoint={
          addWaypoint
        }
        updateWaypoint={
          updateWaypoint
        }
        removeWaypoint={
          removeWaypoint
        }
        viewMode={
          viewMode
        }
        setViewMode={
          setViewMode
        }
        rows={rows}
        params={
          draftParams
        }
        setParams={
          setDraftParams
        }
        trajectoryMeta={
          trajectoryMeta
        }
      />
    ),


    ensemble: (
      <EnsembleModule
        params={
          draftParams
        }
        setParams={
          setDraftParams
        }
        geometry={
          draftGeometry
        }
        noiseBudget={
          draftNoiseBudget
        }
      />
    ),


    analysis: (
      <AnalysisModule
        rows={rows}
      />
    ),


    position: (
      <EstimationModule
        simulation={simulationState}
      />
    ),


    mlupgrade: (
      <MLUpgradeModule />
    ),


    export: (
      <ExportModule
        rows={rows}
        params={
          appliedParams
        }
      />
    ),

  };


  const showApplyBar =
    [
      "vehicle",
      "location",
      "ensemble",
    ].includes(
      activeModule
    );


  return (

    <SimulationProvider>

    <div className="relative min-h-screen">

      <div className="qnav-backdrop" />


      <div className="relative z-10 flex">

        <Sidebar
          active={
            activeModule
          }
          onSelect={
            setActiveModule
          }
          mobileOpen={
            mobileOpen
          }
          setMobileOpen={
            setMobileOpen
          }
        />


        <div className="flex-1 min-w-0">

          <TopBar
            onMenuClick={() =>
              setMobileOpen(
                true
              )
            }
            onDownload={
              handleDownload
            }
            onReset={
              resetAll
            }
            rowCount={
              rows.length
            }
          />


          <main className="px-4 lg:px-6 py-6 max-w-[1400px] mx-auto qnav-scrollbar pb-24">

            <AnimatePresence
              mode="wait"
            >

              <motion.div
                key={
                  activeModule
                }
                initial={{
                  opacity: 0,
                  y: 8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                }}
                transition={{
                  duration: 0.2,
                }}
              >

                {
                  moduleProps[
                    activeModule
                  ]
                }

              </motion.div>

            </AnimatePresence>


            <AnimatePresence>

              {showApplyBar &&
                isDirty && (

                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -8,
                    }}
                    className="mt-4 qnav-unsaved-banner flex items-center justify-between gap-3 px-4 py-3 flex-wrap"
                  >

                    <div className="flex items-center gap-2 text-xs text-gray-700">

                      <SlidersHorizontal
                        size={14}
                        className="text-cyan"
                      />

                      You have unsaved parameter changes — nothing recalculates until you set them.

                    </div>


                    <div className="flex items-center gap-2 shrink-0">

                      <button
                        onClick={
                          discardParams
                        }
                        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-800 px-2.5 py-1.5"
                      >

                        <RotateCcw
                          size={12}
                        />

                        Discard

                      </button>


                      <button
                        onClick={
                          applyParams
                        }
                        className="flex items-center gap-1.5 bg-gradient-to-r from-cyan to-emerald-600 text-white font-semibold text-xs px-4 py-2 rounded-lg"
                      >

                        <CheckCircle2
                          size={14}
                        />

                        Set Parameters

                      </button>

                    </div>

                  </motion.div>

                )}

            </AnimatePresence>


            <footer className="text-[11px] text-gray-400 pt-10 pb-6">

              Geomagnetic truth uses a centered-dipole approximation, not the full IGRF spherical-harmonic model. Sensor noise follows the Qnami NV-ODMR sensitivity formula.

            </footer>

          </main>

        </div>

      </div>


      <AnimatePresence>

        {showApplied && (

          <motion.div
            initial={{
              opacity: 0,
              y: 12,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 8,
              scale: 0.96,
            }}
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-white border border-emerald-300 text-emerald-700 text-xs font-medium px-3.5 py-2.5 rounded-lg"
          >

            <CheckCircle2
              size={15}
            />

            Parameters set —{" "}
            {rows.length.toLocaleString()}{" "}
            samples recomputed

          </motion.div>

        )}

      </AnimatePresence>

    </div>

    </SimulationProvider>

  );

}