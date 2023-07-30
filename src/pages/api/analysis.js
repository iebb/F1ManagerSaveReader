// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import {databasePromise} from "../../libs/cloud/mongodb";

export const handler = async (req, res) => {
  let db = await databasePromise;
  const tracks = [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
  ]
  let v;
  let trackValues = {};
  for(const trackId of tracks) {
    const values = [{}, {}, {}, {}, {}];
    v = await db.collection(`reports_track_${trackId}`).find({}).toArray();
    for(const row of v) {
      for(const loadOut of row.setups) {
        for(let i = 0; i < 4; i++) {
          const rv = Math.round(loadOut.Setups[i] * 560);
          if (!values[i][rv]) values[i][rv] = 0;
          values[i][rv]++;
        }
      }
    }
    trackValues[trackId] = values;
  }
  res.status(200).json({status: "ok", values: trackValues});
};
export default handler;