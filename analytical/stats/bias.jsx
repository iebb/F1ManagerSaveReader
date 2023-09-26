import {Container} from "@mui/material";
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from "@mui/material/TableContainer";
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Head from 'next/head'
import {CarSetupParams} from "../../src/components/CarSetup";
import {circuitNames} from "../../src/js/simple_unloc";
import {databasePromise} from "../../src/libs/cloud/mongodb";


const tracks = [
  2,
  11,
  1,
  4,
  22,
  24,
  6,
  5,
  7,
  9,
  10,
  12,
  13,
  23,
  14,
  15,
  17,
  26,
  19,
  18,
  20,
  25,
  21
]


export const BiasParams = [
  {
    name: "Oversteer",
    index: 0,
    offset: 0.5,
    effect: [0.4, -0.4, -0.1, 0.1, 0],
    render: x => x.toFixed(3),
  },
  {
    // name: "Braking Stability",
    name: "Braking",
    index: 1,
    offset: 0.45,
    effect: [-0.2, 0.2, 0.15, -0.25, 0.2],
    render: x => x.toFixed(3),
  },
  {
    name: "Cornering",
    index: 2,
    offset: 0.2,
    effect: [0.3, 0.25, -0.15, 0.25, -0.05],
    render: x => x.toFixed(3),
  },
  {
    name: "Traction",
    index: 3,
    offset: 0.25,
    effect: [-0.15, 0.25, 0.5, -0.1, 0],
    render: x => x.toFixed(3),
  },
  {
    name: "Straights",
    index: 4,
    offset: 1,
    effect: [-0.1, -0.9, 0, 0, 0],
    render: x => x.toFixed(3),
  },
];


export const setupToBias = (carSetup) => {
  try {
    return BiasParams.map(biasRow => {
        const r = carSetup.map(
          (x, idx) => x * biasRow.effect[idx]
        ).reduce((a,b) => a+b) + biasRow.offset;
        return Math.round(r * 56000) / 56000;
      }
    )
  } catch {
    return [0.5, 0.5, 0.5, 0.5, 0.5];
  }
}



const initialValues = [
  {
    "trackId": 2,
    "track": "Sakhir",
    "values": [
      0.45,
      0.2857142857142857,
      0.375,
      0.8125,
      0.35
    ]
  },
  {
    "trackId": 11,
    "track": "Jeddah",
    "values": [
      0.7,
      0.2857142857142857,
      0,
      1,
      0
    ]
  },
  {
    "trackId": 1,
    "track": "Melbourne",
    "values": [
      0.8,
      0.5714285714285714,
      0.25,
      0.5625,
      0.65
    ]
  },
  {
    "trackId": 4,
    "track": "Baku",
    "values": [
      0.15,
      0.21428571428571427,
      0.75,
      0.3125,
      0.85
    ]
  },
  {
    "trackId": 22,
    "track": "Miami Gardens",
    "values": [
      0.75,
      0.6428571428571429,
      0.75,
      1,
      0.35
    ]
  },
  {
    "trackId": 24,
    "track": "Imola",
    "values": [
      0.65,
      0.5714285714285714,
      0.625,
      1,
      0
    ]
  },
  {
    "trackId": 6,
    "track": "Monte Carlo",
    "values": [
      1,
      1,
      0.125,
      0.8125,
      0.65
    ]
  },
  {
    "trackId": 5,
    "track": "Barcelona",
    "values": [
      0.85,
      0.7142857142857143,
      0.25,
      0.6875,
      0.8
    ]
  },
  {
    "trackId": 7,
    "track": "Montréal",
    "values": [
      0.35,
      0.42857142857142855,
      0.875,
      0.5625,
      0.8
    ]
  },
  {
    "trackId": 9,
    "track": "Spielberg",
    "values": [
      0.5,
      0.5714285714285714,
      1,
      0.5,
      0.8
    ]
  },
  {
    "trackId": 10,
    "track": "Silverstone",
    "values": [
      0.6,
      0.35714285714285715,
      0,
      0.6875,
      0.35
    ]
  },
  {
    "trackId": 12,
    "track": "Budapest",
    "values": [
      0.95,
      0.8571428571428571,
      0.875,
      0.625,
      0.75
    ]
  },
  {
    "trackId": 13,
    "track": "Spa-Francorchamps",
    "values": [
      0.3,
      0.07142857142857142,
      0.625,
      0.875,
      0.6
    ]
  },
  {
    "trackId": 23,
    "track": "Zandvoort",
    "values": [
      0.95,
      0.6428571428571429,
      0.375,
      0.5625,
      0.9
    ]
  },
  {
    "trackId": 14,
    "track": "Monza",
    "values": [
      0.1,
      0,
      1,
      0.375,
      0.9
    ]
  },
  {
    "trackId": 15,
    "track": "Singapore",
    "values": [
      0.8,
      0.9285714285714286,
      0.125,
      0.0625,
      1
    ]
  },
  {
    "trackId": 17,
    "track": "Suzuka",
    "values": [
      0.7,
      0.5714285714285714,
      0.5,
      1,
      0
    ]
  },
  {
    "trackId": 26,
    "track": "Losail",
    "values": [
      0.8,
      0.5714285714285714,
      0.25,
      0.8125,
      0.9
    ]
  },
  {
    "trackId": 19,
    "track": "Austin",
    "values": [
      0.8,
      0.5714285714285714,
      0.875,
      0.9375,
      0.25
    ]
  },
  {
    "trackId": 18,
    "track": "Mexico City",
    "values": [
      0.65,
      0.5714285714285714,
      0.875,
      0.9375,
      0.35
    ]
  },
  {
    "trackId": 20,
    "track": "São Paulo",
    "values": [
      0.7,
      0.5714285714285714,
      0.875,
      0.875,
      0.55
    ]
  },
  {
    "trackId": 25,
    "track": "Las Vegas",
    "values": [
      0,
      0.21428571428571427,
      1,
      0.375,
      0.55
    ]
  },
  {
    "trackId": 21,
    "track": "Yas Island",
    "values": [
      0.5,
      0.5,
      0.75,
      0.75,
      0.95
    ]
  }
];


const tIV = {};

initialValues.map(x => tIV[x.trackId] = setupToBias(x.values));





export const getServerSideProps = async () => {
  let db = await databasePromise;
  let v;
  let trackValues = {};
  let trackBiases = {};
  let avgDiffs = {};
  for(const trackId of tracks) {
    const values = [{}, {}, {}, {}, {}];
    const biases = [{}, {}, {}, {}, {}];
    let avgDiff = 0;
    let cnt = 0;
    let trackInitialBias = tIV[trackId];
    v = await db.collection(`reports_track_${trackId}`).find({}).toArray();
    for(const row of v) {
      for(const loadOut of row.setups) {
        const bias = setupToBias(loadOut.Setups);
        avgDiff += bias.map((x, v) =>
          Math.min(Math.abs(x - trackInitialBias[v]), 0.2)
        ).reduce((x, y) => x+y, 0);
        cnt += 1;

        for(let i = 0; i < 5; i++) {
          const rv = Math.round(loadOut.Setups[i] * 560);
          if (!values[i][rv]) values[i][rv] = 0;
          values[i][rv]++;
        }
        for(let i = 0; i < 5; i++) {
          const rv = Math.round(bias[i] * 10000);
          if (!biases[i][rv]) biases[i][rv] = 0;
          biases[i][rv]++;
        }
      }
    }
    trackValues[trackId] = values;
    trackBiases[trackId] = biases;
    avgDiffs[trackId] = avgDiff / cnt;
  }

  return { props: { trackValues, trackBiases, avgDiffs } }
}



export default function TracksData( { trackValues, trackBiases, avgDiffs } ) {

  const parseData = (d, step) => {
    const ret = [];
    for(let x = 0; x * step <= 100; x++) {
      ret.push([x, d[x * step] || 0]);
    }
    return ret;
  }

  const minMax = (d) => {
    const data = Object.keys(d).map(x => parseInt(x, 10)).sort();
    return `${(data[0] * 0.0001).toFixed(4)}, ${(data[data.length - 1] * 0.0001).toFixed(4)}`;
  }

  return (
    <>
      <Head>
        <title>F1 Manager Save Viewer</title>
        <meta name="description" content="F1 Manager Save Viewer by ieb" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container maxWidth="xl" component="main" sx={{ pt: 1, pb: 1 }}>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>Track</TableCell>
                <TableCell>Avg Diff</TableCell>
                {
                  [0, 1, 2, 3, 4].map(i => {
                    return (
                      <TableCell
                        align="right"
                        key={i}
                      >
                        {CarSetupParams[i].name}
                      </TableCell>
                    )
                  })
                }
              </TableRow>
            </TableHead>
            <TableBody>
              {
                tracks.map(t => (
                  <TableRow
                    key={t}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell
                      component="th"
                      scope="row"
                      style={{ width: "10%" }}
                    >
                      {circuitNames[t]}
                    </TableCell>
                    <TableCell
                      component="th"
                      scope="row"
                      style={{ width: "10%" }}
                    >
                      {avgDiffs[t]}
                    </TableCell>
                    {
                      [0, 1, 2, 3, 4].map(i => {
                        return (
                          <TableCell
                            align="right"
                            key={i}
                          >
                            {minMax(trackBiases[t][i])}
                          </TableCell>
                        )
                      })
                    }
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </>
  )
}
