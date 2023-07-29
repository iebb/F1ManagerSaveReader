// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import {databasePromise} from "../../libs/cloud/mongodb";

export const handler = async (req, res) => {
  let db = await databasePromise;
  const { seed, weekend, trackId, setups } = req.body;
  await db.collection(`reports_track_${trackId}`).insertOne(
    { seed, trackId, setups, weekend },
  );
  await db.collection(`reports_total`).updateOne(
    { seed },
    {
      $inc: {
        reports: 1,
      }
    },
    { upsert: true },
  );
  res.status(200).json({status: "ok"});
};
export default handler;