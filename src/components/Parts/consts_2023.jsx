
const PartType_Engine = 0;
const PartType_ERS = 1;
const PartType_Gearbox = 2;
const PartType_Body = 3;
const PartType_FrontWing = 4;
const PartType_RearWing = 5;
const PartType_SidePods = 6;
const PartType_Floor = 7;
const PartType_Suspension = 8;

const PartStat_AirFlowFront = 0;
const PartStat_AirFlowTolerance = 1;
const PartStat_BrakeCooling = 2;
const PartStat_DRSDelta = 3;
const PartStat_DragReduction = 4;
const PartStat_EngineCooling = 5;
const PartStat_FuelEfficiency = 6;
const PartStat_LowSpeedDownforce = 7;
const PartStat_MedSpeedDownforce = 8;
const PartStat_HighSpeedDownforce = 9;
const PartStat_Power = 10;
const PartStat_PerformanceThreshold = 11;
const PartStat_PerformanceLoss = 12;
const PartStat_AirFlowMiddle = 13;
const PartStat_OperationalRange = 14;
const PartStat_Durability = 15;

const PartStat_Inverted_Weight = 1500;




export const valueToUnitValue = {
  0: x => x / 10,
  1: x => x / 10,
  2: x => x / 10,
  3: x => x / 10,
  4: x => x / 10,
  5: x => x / 10,

  6: x => (90 + x / 1000 * 10),

  7: x => (0.002 * x + 3),
  8: x => (0.002 * x + 5),
  9: x => (0.001 * x + 7),

  10: x => (90 + x / 1000 * 10),
  11: x => (85 - x / 1000 * 20),
  12: x => (70 + x / 1000 * 15),
  13: x => (x / 10),
  14: x => (85 + x / 1000 * 15),
  15: x => (40 + x / 1000 * 30),
}

export const unitValueToValue = {
  0: x => x * 10,
  1: x => x * 10,
  2: x => x * 10,
  3: x => x * 10,
  4: x => x * 10,
  5: x => x * 10,

  6: x => (x - 90) * 1000 / 10,

  7: x => (x - 3) / 0.002,
  8: x => (x - 5) / 0.002,
  9: x => (x - 7) / 0.001,

  10: x => (x - 90) * 1000 / 10,
  11: x => (85 - x) * 1000 / 20,
  12: x => (x - 70) * 1000 / 15,
  13: x => x * 10,
  14: x => (85 - x) * 1000 / 15,
  15: x => (x - 40) * 1000 / 30,
}
export const valueToDeltaUnitValue = {
  0: 0.1,
  1: 0.1,
  2: 0.1,
  3: 0.1,
  4: 0.1,
  5: 0.1,

  6: 0.01,

  7: 0.002,
  8: 0.002,
  9: 0.001,

  10: 0.01,
  11: -0.02,
  12: 0.015,
  13: 0.1,
  14: 0.015,
  15: 0.03,
}

export const statRenderer = {
  0: x => `${(x).toFixed(2)}%`,
  1: x => `${(x).toFixed(2)}%`,
  2: x => `${(x).toFixed(2)}%`,
  3: x => `${(x).toFixed(2)}%`,
  4: x => `${(x).toFixed(2)}%`,
  5: x => `${(x).toFixed(2)}%`,

  6: x => `${(x).toFixed(2)}%`,

  7: x => `${(x).toFixed(2)} kN`,
  8: x => `${(x).toFixed(2)} kN`,
  9: x => `${(x).toFixed(2)} kN`,

  10: x => `${(x).toFixed(2)}%`,
  11: x => `${(x).toFixed(2)}%`,
  12: x => `${(x).toFixed(2)}%`,
  13: x => `${(x).toFixed(2)}%`,
  14: x => `${(x).toFixed(2)}%`,
  15: x => `${(x).toFixed(2)}%`,
}


export const PartStatNames = [
  "Airflow Front",
  "Airflow Sensitivity",
  "Brake Cooling",
  "DRS Delta",
  "Drag Reduction",
  "Engine Cooling",
  "Fuel Efficiency",
  "Low Speed Downforce",
  "Med Speed Downforce",
  "High Speed Downforce",
  "Power",
  "Power Loss Threshold",
  "Wear Resistance",
  "Airflow Middle",
  "Thermal Resistance",
  "Minimum Lifespan",
];

export const PartStats2023 = [
  { id: 10, name: 'Power' },
  { id: 0, name: 'Airflow Front' },
  { id: 13, name: 'Airflow Middle' },
  { id: 1, name: 'Airflow Sensitivity' },
  { id: 2, name: 'Brake Cooling' },
  { id: 3, name: 'DRS Delta' },
  { id: 4, name: 'Drag Reduction' },
  { id: 5, name: 'Engine Cooling' },
  { id: 7, name: 'Low Speed Downforce' },
  { id: 8, name: 'Med Speed Downforce' },
  { id: 9, name: 'High Speed Downforce' },
  // { id: 6, name: 'Fuel Efficiency' },
  // { id: 11, name: 'Power Loss Threshold' },
  // { id: 12, name: 'Wear Resistance' },
  // { id: 14, name: 'Thermal Resistance' },
  {
    id: 15,
    name: 'Extra Weight',
    // name: 'Minimum Lifespan',
    digits: 0, displayDigits: 0,
    render: (x) => `${(x / 1000 * 2).toFixed(1)} kg`
  }
];

export const PartCalculationStats2023 = [
  { id: 0, name: 'Top Speed',
    digits: 5,
    bounds: [313, 328],
    render: v => `${v.toFixed(4)} kph`,
    contributors: {
      [PartStat_DragReduction]: 1
    },
  },
  { id: 1, name: 'Acceleration',
    digits: 5,
    bounds: [1.8, 1.9],
    render: v => `${v.toFixed(4)} G`,
    contributors: {
      [PartStat_Power]: 0.5,
      [PartStat_DragReduction]: 0.5,
      [PartStat_Inverted_Weight]: 0.15,
    },
  },
  { id: 16, name: 'DRS Effectiveness',
    digits: 5,
    bounds: [0, 100],
    render: v => `${v.toFixed(3)}%`,
    contributors: {
      [PartStat_DRSDelta]: 1,
    },
  },
  { id: 7, name: 'Low Speed',
    digits: 5,
    bounds: [2, 3],
    render: v => `${v.toFixed(4)} G`,
    contributors: {
      [PartStat_AirFlowFront]: 0.6,
      [PartStat_LowSpeedDownforce]: 1,
      [PartStat_Inverted_Weight]: 0.24,
    },
  },
  { id: 8, name: 'Medium Speed',
    digits: 5,
    bounds: [3, 4],
    render: v => `${v.toFixed(4)} G`,
    contributors: {
      [PartStat_AirFlowFront]: 0.4,
      [PartStat_AirFlowMiddle]: 0.4,
      [PartStat_MedSpeedDownforce]: 1,
      [PartStat_Inverted_Weight]: 0.27,
    },
  },
  { id: 9, name: 'High Speed',
    digits: 5,
    bounds: [4, 5.5],
    render: v => `${v.toFixed(4)} G`,
    contributors: {
      [PartStat_AirFlowMiddle]: 0.6,
      [PartStat_HighSpeedDownforce]: 1,
      [PartStat_Inverted_Weight]: 0.24,
    },
  },
  { id: 12, name: 'Dirty Air Tolerance',
    digits: 5,
    bounds: [0, 100],
    render: v => `${v.toFixed(3)}%`,
    contributors: {
      [PartStat_AirFlowTolerance]: 1,
    },
  },
  { id: 14, name: 'Brake Cooling',
    digits: 5,
    bounds: [0, 100],
    render: v => `${v.toFixed(3)}%`,
    contributors: {
      [PartStat_BrakeCooling]: 1,
    },
  },
  { id: 13, name: 'Engine Cooling',
    digits: 5,
    bounds: [0, 100],
    render: v => `${v.toFixed(3)}%`,
    contributors: {
      [PartStat_EngineCooling]: 1,
    },
  }
]


/*PartStatNames.map(
  (n, _idx) => ({id: _idx, name: n})
)*/


export const PartStatsCategorized2023 = [
  {
    id: 0,
    category: "Powertrains",
    prefix: "PT",
    parts: [0, 1, 2],
    stats: [
      {id: "0_6", part: 0, stat: 6, digits: 0, displayDigits: 0},
      {id: "0_10", part: 0, stat: 10, digits: 0, displayDigits: 0},
      {id: "0_11", part: 0, stat: 11, digits: 0, displayDigits: 0},
      {id: "0_12", part: 0, stat: 12, digits: 0, displayDigits: 0},
      {id: "0_14", part: 0, stat: 14, digits: 0, displayDigits: 0},
      {id: "1_15", part: 1, stat: 15, digits: 0, displayDigits: 0, name: "ERS Lifespan"},
      {id: "2_15", part: 2, stat: 15, digits: 0, displayDigits: 0, name: "Gearbox Lifespan"},
    ],
  },
  {
    id: 1,
    category: "Chassis",
    prefix: "C",
    parts: [3],
    stats: [
      {id: "3_4", part: 3, stat: 4, digits: 4, displayDigits: 4},
      {id: "3_5", part: 3, stat: 5, digits: 4, displayDigits: 4},
      {id: "3_13", part: 3, stat: 13, digits: 4, displayDigits: 4},
      {id: "3_15", part: 3, stat: 15, digits: 0, displayDigits: 0,
        hideInExpertise: true,
        hideInVersions: [2],
        statRenderer: x => x + " km",
        valueToDeltaUnitValue: 270 / 100,
        unitValueToValue: x => (x - 3800) * 100 / 270,
      },
    ],
  },
  {
    id: 2,
    category: "Front Wing",
    prefix: "FW",
    parts: [4],
    stats: [
      {id: "4_0", part: 4, stat: 0, digits: 4, displayDigits: 4},
      {id: "4_1", part: 4, stat: 1, digits: 4, displayDigits: 4},
      {id: "4_2", part: 4, stat: 2, digits: 4, displayDigits: 4},
      {id: "4_7", part: 4, stat: 7, digits: 4, displayDigits: 4},
      {id: "4_8", part: 4, stat: 8, digits: 4, displayDigits: 4},
      {id: "4_9", part: 4, stat: 9, digits: 4, displayDigits: 4},
      {id: "4_15", part: 4, stat: 15, digits: 0, displayDigits: 0,
        hideInExpertise: true,
        hideInVersions: [2],
        statRenderer: x => x + " km",
        valueToDeltaUnitValue: 375 / 100,
        unitValueToValue: x => (x - 1250) * 100 / 375,
      },
    ],
  },
  {
    id: 3,
    category: "Rear Wing",
    prefix: "RW",
    parts: [5],
    stats: [
      {id: "5_1", part: 5, stat: 1, digits: 4, displayDigits: 4},
      {id: "5_3", part: 5, stat: 3, digits: 4, displayDigits: 4},
      {id: "5_4", part: 5, stat: 4, digits: 4, displayDigits: 4},
      {id: "5_7", part: 5, stat: 7, digits: 4, displayDigits: 4},
      {id: "5_8", part: 5, stat: 8, digits: 4, displayDigits: 4},
      {id: "5_9", part: 5, stat: 9, digits: 4, displayDigits: 4},
      {id: "5_15", part: 5, stat: 15, digits: 0, displayDigits: 0,
        hideInExpertise: true,
        hideInVersions: [2],
        statRenderer: x => x + " km",
        valueToDeltaUnitValue: 295 / 100,
        unitValueToValue: x => (x - 1650) * 100 / 295,
      },
    ],
  },
  {
    id: 4,
    category: "Sidepods",
    prefix: "SP",
    parts: [6],
    stats: [
      {id: "6_0", part: 6, stat: 0, digits: 4, displayDigits: 4},
      {id: "6_4", part: 6, stat: 4, digits: 4, displayDigits: 4},
      {id: "6_5", part: 6, stat: 5, digits: 4, displayDigits: 4},
      {id: "6_13", part: 6, stat: 13, digits: 4, displayDigits: 4},
      {id: "6_15", part: 6, stat: 15, digits: 0, displayDigits: 0,
        hideInExpertise: true,
        hideInVersions: [2],
        statRenderer: x => x + " km",
        valueToDeltaUnitValue: 275 / 100,
        unitValueToValue: x => (x - 2750) * 100 / 275,
      },
    ],
  },
  {
    id: 5,
    category: "Underfloor",
    prefix: "UF",
    parts: [7],
    stats: [
      {id: "7_1", part: 7, stat: 1, digits: 4, displayDigits: 4},
      {id: "7_4", part: 7, stat: 4, digits: 4, displayDigits: 4},
      {id: "7_7", part: 7, stat: 7, digits: 4, displayDigits: 4},
      {id: "7_8", part: 7, stat: 8, digits: 4, displayDigits: 4},
      {id: "7_9", part: 7, stat: 9, digits: 4, displayDigits: 4},
      {id: "7_15", part: 7, stat: 15, digits: 0, displayDigits: 0,
        hideInExpertise: true,
        hideInVersions: [2],
        statRenderer: x => x + " km",
        valueToDeltaUnitValue: 290 / 100,
        unitValueToValue: x => (x - 2100) * 100 / 290,
      },
    ],
  },
  {
    id: 6,
    category: "Suspension",
    prefix: "S",
    parts: [8],
    stats: [
      {id: "8_0", part: 8, stat: 0, digits: 4, displayDigits: 4},
      {id: "8_2", part: 8, stat: 2, digits: 4, displayDigits: 4},
      {id: "8_4", part: 8, stat: 4, digits: 4, displayDigits: 4},
      {id: "8_7", part: 8, stat: 7, digits: 4, displayDigits: 4},
      {id: "8_8", part: 8, stat: 8, digits: 4, displayDigits: 4},
      {id: "8_9", part: 8, stat: 9, digits: 4, displayDigits: 4},
      {id: "8_15", part: 8, stat: 15, digits: 0, displayDigits: 0,
        hideInExpertise: true,
        hideInVersions: [2],
        statRenderer: x => x + " km",
        valueToDeltaUnitValue: 240 / 100,
        unitValueToValue: x => (x - 1700) * 100 / 240,
      },
    ],
  },
].map(
  category => {
    for(const stat of category.stats) {
      if (!stat.name) {
        stat.name = PartStatNames[stat.stat]
      }
    }
    return category;
  }
);


export const PSF2023 =  {
  [PartStat_FuelEfficiency]: {
    [PartType_Engine]: 1.0
  },
  [PartStat_Power]: {
    [PartType_Engine]: 1.0
  },
  [PartStat_PerformanceThreshold]: {
    [PartType_Engine]: 1.0
  },
  [PartStat_PerformanceLoss]: {
    [PartType_Engine]: 1.0
  },
  [PartStat_OperationalRange]: {
    [PartType_Engine]: 1.0
  },
  [PartStat_Durability]: {
    [PartType_ERS]: 0.0,
    [PartType_Gearbox]: 0.0,
    [PartType_Body]: 5.0,
    [PartType_FrontWing]: 2.0,
    [PartType_RearWing]: 3.0,
    [PartType_SidePods]: 5.0,
    [PartType_Floor]: 4.0,
    [PartType_Suspension]: 1.0
  },
  [PartStat_DragReduction]: {
    [PartType_Body]: 0.2,
    [PartType_RearWing]: 0.3,
    [PartType_SidePods]: 0.2,
    [PartType_Floor]: 0.2,
    [PartType_Suspension]: 0.1
  },
  [PartStat_EngineCooling]: {
    [PartType_Body]: 0.4,
    [PartType_SidePods]: 0.6
  },
  [PartStat_AirFlowMiddle]: {
    [PartType_Body]: 0.6,
    [PartType_SidePods]: 0.4
  },
  [PartStat_AirFlowFront]: {
    [PartType_FrontWing]: 0.4,
    [PartType_SidePods]: 0.2,
    [PartType_Suspension]: 0.4
  },
  [PartStat_AirFlowTolerance]: {
    [PartType_FrontWing]: 0.4,
    [PartType_RearWing]: 0.4,
    [PartType_Floor]: 0.2
  },
  [PartStat_BrakeCooling]: {
    [PartType_FrontWing]: 0.4,
    [PartType_Suspension]: 0.6
  },
  [PartStat_LowSpeedDownforce]: {
    [PartType_FrontWing]: 0.2,
    [PartType_RearWing]: 0.2,
    [PartType_Floor]: 0.3,
    [PartType_Suspension]: 0.3
  },
  [PartStat_MedSpeedDownforce]: {
    [PartType_FrontWing]: 0.2,
    [PartType_RearWing]: 0.2,
    [PartType_Floor]: 0.5,
    [PartType_Suspension]: 0.1
  },
  [PartStat_HighSpeedDownforce]: {
    [PartType_FrontWing]: 0.2,
    [PartType_RearWing]: 0.2,
    [PartType_Floor]: 0.5,
    [PartType_Suspension]: 0.1
  },
  [PartStat_DRSDelta]: {
    [PartType_RearWing]: 1.0
  }
};
