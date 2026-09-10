// Validated operating envelopes per vehicle type.
// Used to (a) populate sensible defaults, (b) clamp/disable UI controls,
// and (c) drive the trajectory generator's physical constraints.

export const VEHICLE_PRESETS = {
  ground_vehicle: {
    label: "Ground Vehicle (car / truck)",
    speedRange: [0, 40], // m/s (0-144 km/h)
    defaultSpeed: 20,
    altRange: [0, 50], // m — stays near ground level
    defaultAlt: 0,
    allowClimb: false,
    defaultClimbRate: 0,
    turnRateRange: [0, 15], // deg/s
    defaultTurnRate: 5,
    icon: "🚗",
  },
  aircraft: {
    label: "Aircraft (fixed-wing)",
    speedRange: [50, 260], // m/s (~180-936 km/h)
    defaultSpeed: 120,
    altRange: [0, 12000], // m
    defaultAlt: 3000,
    allowClimb: true,
    defaultClimbRate: 5,
    turnRateRange: [0, 5],
    defaultTurnRate: 2,
    icon: "✈️",
  },
  drone: {
    label: "Drone / UAV",
    speedRange: [0, 30], // m/s
    defaultSpeed: 12,
    altRange: [0, 500], // m
    defaultAlt: 80,
    allowClimb: true,
    defaultClimbRate: 2,
    turnRateRange: [0, 30],
    defaultTurnRate: 10,
    icon: "🚁",
  },
  ship: {
    label: "Ship / Marine Vessel",
    speedRange: [0, 20], // m/s (~0-40 knots)
    defaultSpeed: 8,
    altRange: [0, 5], // effectively sea level
    defaultAlt: 0,
    allowClimb: false,
    defaultClimbRate: 0,
    turnRateRange: [0, 3],
    defaultTurnRate: 1,
    icon: "🚢",
  },
};

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
