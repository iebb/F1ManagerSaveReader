import {Container} from "@mui/material";
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from "@mui/material/TableContainer";
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ReactECharts from 'echarts-for-react';
import Head from 'next/head'
import {CarSetupParams} from "../../src/components/F1M2023/CarSetup";
import {circuitNames} from "../../src/js/localization";
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

export const getServerSideProps = async () => {
  let db = await databasePromise;
  let v;
  let trackValues = {};
  let trackBiases = {};
  for(const trackId of tracks) {
    const values = [{}, {}, {}, {}, {}];
    const biases = [{}, {}, {}, {}, {}];
    v = await db.collection(`reports_track_${trackId}`).find({}).toArray();
    for(const row of v) {
      for(const loadOut of row.setups) {
        const bias = setupToBias(loadOut.Setups);
        for(let i = 0; i < 5; i++) {
          const rv = Math.round(loadOut.Setups[i] * 560);
          if (!values[i][rv]) values[i][rv] = 0;
          values[i][rv]++;
        }
        for(let i = 0; i < 5; i++) {
          const rv = Math.round(bias[i] * 100);
          if (!biases[i][rv]) biases[i][rv] = 0;
          biases[i][rv]++;
        }
      }
    }
    trackValues[trackId] = values;
    trackBiases[trackId] = biases;
  }

  return { props: { trackValues, trackBiases } }
}

export default function TracksData( { trackValues, trackBiases } ) {

  const splits = [20, 14, 8, 16, 20];
  const displayIntervals = [4, 3.5, 2, 4, 5];
  const intervals = splits.map(x => 560 / x);

  const parseData = (d, step) => {
    const ret = [];
    for(let x = 0; x * step <= 560; x++) {
      ret.push([x, d[x * step] || 0]);
    }
    return ret;
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
                    {
                      [0, 1, 2, 3, 4].map(i => {
                        return (
                          <TableCell
                            align="right"
                            key={i}
                            style={{ width: "18%", height: 150 }}
                          >
                            <ReactECharts
                              theme="dark"
                              style={{ height: 200 }}
                              option={{
                                backgroundColor: "transparent",
                                grid: {
                                  show: false,
                                  left: 15,
                                  right: 15,
                                  top: 20,
                                  bottom: 20,
                                },
                                xAxis: {
                                  type: 'value',
                                  showGrid: false,
                                  min: 0,
                                  max: splits[i],
                                  minInterval: displayIntervals[i],
                                  axisLabel: {
                                    formatter: v => CarSetupParams[i].render(
                                      CarSetupParams[i].min + (CarSetupParams[i].max - CarSetupParams[i].min) * (v / splits[i])
                                    ),
                                  },
                                  axisLine: {
                                    show: false, // Hide full Line
                                  },
                                  splitLine: {
                                    show: false
                                  },
                                  axisTick: {
                                    show: false, // Hide Ticks,
                                  },
                                },
                                yAxis: {
                                  type: 'value',
                                  axisLabel: {
                                    show: false,
                                  },
                                  axisLine: {
                                    show: false, // Hide full Line
                                  },
                                  splitLine: {
                                    show: false
                                  },
                                  axisTick: {
                                    show: false, // Hide Ticks,
                                  },
                                },
                                series: [
                                  {
                                    data: parseData(trackValues[t][i], intervals[i]),
                                    type: 'bar',
                                    barWidth: '95%',
                                    label: {
                                      show: true,
                                      position: 'top',
                                      formatter: x => x.value[1] ? x.value[1] : ""
                                    },
                                  }
                                ]
                              }}
                            />
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
