"use client";

import { Canvas } from "@react-three/fiber";

import {
  OrbitControls,
  Html,
  Line,
} from "@react-three/drei";

import {
  Suspense,
  useMemo,
} from "react";


function latLonToLocal(
  lat,
  lon,
  alt,
  origin
) {

  const earthRadius =
    6371000;


  const latRad =
    ((lat - origin.lat) *
      Math.PI) /
    180;


  const lonRad =
    ((lon - origin.lon) *
      Math.PI) /
    180;


  const meanLat =
    ((lat + origin.lat) / 2) *
    Math.PI /
    180;


  const north =
    latRad *
    earthRadius;


  const east =
    lonRad *
    earthRadius *
    Math.cos(
      meanLat
    );


  const up =
    alt -
    origin.alt;


  return {
    x: east,
    y: up,
    z: -north,
  };

}


function ReceiverMarker({
  position,
  color,
  label,
}) {

  return (

    <group
      position={position}
    >

      <mesh>

        <sphereGeometry
          args={[
            0.11,
            24,
            24,
          ]}
        />

        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
        />

      </mesh>


      <mesh>

        <ringGeometry
          args={[
            0.17,
            0.21,
            32,
          ]}
        />

        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.45}
        />

      </mesh>


      <Html
        position={[
          0,
          0.3,
          0,
        ]}
        center
      >

        <div
          style={{
            color,
            fontSize: 10,
            fontFamily:
              "ui-monospace, monospace",
            fontWeight: 700,
            whiteSpace:
              "nowrap",
            textShadow:
              "0 0 4px white",
          }}
        >
          {label}
        </div>

      </Html>

    </group>

  );

}


function Scene({
  trajectory,
  currentIndex,
}) {

  const origin =
    useMemo(() => {

      const first =
        trajectory[0];


      return {

        lat:
          Number(
            first.actual_lat
          ),

        lon:
          Number(
            first.actual_lon
          ),

        alt:
          Number(
            first.actual_alt
          ),

      };

    }, [
      trajectory,
    ]);


  const actualPositions =
    trajectory.map(
      (point) =>
        latLonToLocal(
          Number(
            point.actual_lat
          ),
          Number(
            point.actual_lon
          ),
          Number(
            point.actual_alt
          ),
          origin
        )
    );


  const predictedPositions =
    trajectory.map(
      (point) =>
        latLonToLocal(
          Number(
            point.predicted_lat
          ),
          Number(
            point.predicted_lon
          ),
          Number(
            point.predicted_alt
          ),
          origin
        )
    );


  const allPositions = [
    ...actualPositions,
    ...predictedPositions,
  ];


  const maxDistance =
    Math.max(
      ...allPositions.map(
        (position) =>
          Math.sqrt(
            position.x ** 2 +
            position.y ** 2 +
            position.z ** 2
          )
      ),
      1
    );


  const scale =
    3.2 /
    maxDistance;


  const scalePoints =
    (points) =>
      points.map(
        (point) => [
          point.x * scale,
          point.y * scale,
          point.z * scale,
        ]
      );


  const actualPath =
    scalePoints(
      actualPositions
    );


  const predictedPath =
    scalePoints(
      predictedPositions
    );


  const currentActual =
    actualPath[
      currentIndex
    ] ||
    actualPath[0];


  const currentPredicted =
    predictedPath[
      currentIndex
    ] ||
    predictedPath[0];


  return (

    <>

      <ambientLight
        intensity={0.9}
      />


      <pointLight
        position={[
          5,
          6,
          5,
        ]}
        intensity={30}
      />


      <pointLight
        position={[
          -5,
          -3,
          -4,
        ]}
        intensity={15}
      />


      <gridHelper
        args={[
          8,
          16,
          "#94a3b8",
          "#dbe3ec",
        ]}
        position={[
          0,
          -0.9,
          0,
        ]}
      />


      <axesHelper
        args={[
          2.5,
        ]}
      />


      <Line
        points={
          actualPath
        }
        color="#0e7490"
        lineWidth={2}
      />


      <Line
        points={
          predictedPath
        }
        color="#f59e0b"
        lineWidth={2}
      />


      <Line
        points={[
          currentActual,
          currentPredicted,
        ]}
        color="#ef4444"
        lineWidth={3}
      />


      <ReceiverMarker
        position={
          currentActual
        }
        color="#0e7490"
        label="ACTUAL"
      />


      <ReceiverMarker
        position={
          currentPredicted
        }
        color="#f59e0b"
        label="PREDICTED"
      />


      <Html
        position={[
          0,
          -1.25,
          0,
        ]}
        center
      >

        <div
          style={{
            fontFamily:
              "ui-monospace, monospace",
            fontSize: 10,
            color: "#64748b",
            whiteSpace:
              "nowrap",
            background:
              "rgba(255,255,255,0.8)",
            padding:
              "4px 7px",
            borderRadius:
              "5px",
          }}
        >

          <span
            style={{
              color: "#0e7490",
            }}
          >
            ● Actual
          </span>

          {"  "}

          <span
            style={{
              color: "#f59e0b",
            }}
          >
            ● Predicted
          </span>

          {"  "}

          <span
            style={{
              color: "#ef4444",
            }}
          >
            ● Error
          </span>

        </div>

      </Html>


      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={10}
      />

    </>

  );

}


export default function PositionEstimation3D({
  trajectory,
  currentIndex,
}) {

  if (
    !trajectory ||
    !trajectory.length
  ) {

    return (

      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">

        No trajectory data available.

      </div>

    );

  }


  return (

    <div className="w-full h-full">

      <Canvas
        camera={{
          position: [
            4,
            3,
            5,
          ],
          fov: 45,
        }}
      >

        <Suspense
          fallback={null}
        >

          <Scene
            trajectory={
              trajectory
            }
            currentIndex={
              currentIndex
            }
          />

        </Suspense>

      </Canvas>

    </div>

  );

}