"use client";

import { createContext, useContext, useState } from "react";

const SimulationContext = createContext();

export function SimulationProvider({ children }) {

  // Vehicle

  const [vehicleType, setVehicleType] = useState("Ground");
  const [speed, setSpeed] = useState(20);
  const [altitude, setAltitude] = useState(0);

 
  // Location
 
  const [latitude, setLatitude] = useState(23.1800);
  const [longitude, setLongitude] = useState(72.5700);
  const [waypoints, setWaypoints] = useState([]);


  // Sensor Ensemble

  const [diamondCount, setDiamondCount] = useState(4);
  const [noise, setNoise] = useState(0.02);


  // Simulation
 
  const [currentTime, setCurrentTime] = useState(0);

  return (
    <SimulationContext.Provider
      value={{
        // Vehicle
        vehicleType,
        setVehicleType,

        speed,
        setSpeed,

        altitude,
        setAltitude,

        // Location
        latitude,
        setLatitude,

        longitude,
        setLongitude,

        waypoints,
        setWaypoints,

        // Sensor
        diamondCount,
        setDiamondCount,

        noise,
        setNoise,

        // Time
        currentTime,
        setCurrentTime,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  return useContext(SimulationContext);
}