const pako = require("pako");
const { saveAs } = require("file-saver");
const toInteger = (x) => {
  return ((
      x.charCodeAt(3) * 256 +
      x.charCodeAt(2)) * 256 +
    x.charCodeAt(1)) * 256 + x.charCodeAt(0);
}

const toBuffer = (x) => new Int32Array([n]).buffer

export const analyzeFileToDatabase = async (file) => {
  if (!window.SQL) return;

  return new Promise((resolve) => {

    if (file !== undefined) {
      let reader = new FileReader();
      reader.onload = async (e) => {
        const data= reader.result;
        const version = data.charCodeAt(4);
        const metaLength = data.indexOf("\x00\x05\x00\x00\x00\x4E\x6F\x6E\x65\x00\x05\x00\x00\x00\x4E\x6F\x6E\x65\x00\x00\x00\x00\x00") + 19 + 4;

        const size_0 = toInteger(data.slice(metaLength, metaLength + 4));
        const size_1 = toInteger(data.slice(metaLength + 4, metaLength + 8));
        const size_2 = toInteger(data.slice(metaLength + 8, metaLength + 12));
        const size_3 = toInteger(data.slice(metaLength + 12, metaLength + 16));

        const remainingData = data.slice(metaLength + 16);

        let compressedData = Uint8Array.from(remainingData, (c) => c.charCodeAt(0));

        const output = pako.inflate(compressedData);
        const database_file = output.slice(0, size_1);

        // @ts-ignore

        const db = new window.SQL.Database(database_file);

        const metadata = {
          filename: file.name,
          version,
          chunk0: Uint8Array.from(
            data.slice(0, metaLength), (c) => c.charCodeAt(0)
          ),
          meta_length: metaLength,
          database_file,
          other_database: [{
            size: size_2,
            file: output.slice(size_1, size_1 + size_2),
          }, {
            size: size_3,
            file: output.slice(size_1 + size_2, size_1 + size_2 + size_3),
          }]
        }


        resolve({
          db,
          version,
          metadata
        });

        /*

        format:

        metadata: [0 - metaLength]
        size0: [metaLength, metaLength + 4] = size of compressed data
        size1: [metaLength + 4, metaLength + 8] = size of db
        size2: [metaLength + 8, metaLength + 12] = size of backup db 1
        size3: [metaLength + 12, metaLength + 16] = size of backup db 2
        remainingdata = deflated [
          db, <size = size1>
          db_backup1, <size = size2>
          db_backup2, <size = size3>
        ]


         */



      };
      reader.readAsBinaryString(file);
    }
  });
}

export const repack = (db, metadata) => {
  const db_data = db.export();
  const db_size = db_data.length;

  const { other_database, meta_length } = metadata;

  const s1 = other_database[0].size;
  const s2 = other_database[1].size;

  const compressedData = new Buffer(db_size + s1 + s2);
  compressedData.set(db_data, 0);
  compressedData.set(other_database[0].file, db_size);
  compressedData.set(other_database[1].file, db_size + s1);

  const compressed = pako.deflate(compressedData);
  const compressed_size = compressed.length;


  const finalData = new Buffer(meta_length + 16 + compressed_size);

  finalData.set(metadata.chunk0, 0);
  finalData.writeInt32LE(compressed_size, meta_length);
  finalData.writeInt32LE(db_size, meta_length + 4);
  finalData.writeInt32LE(s1, meta_length + 8);
  finalData.writeInt32LE(s2, meta_length + 12);
  finalData.set(compressed, meta_length + 16);

  saveAs(new Blob([finalData], {type: "application/binary"}), metadata.filename);
}
export const dump = (db, metadata) => {
  saveAs(new Blob([db.export()], {type: "application/vnd.sqlite3"}), metadata.filename + ".db");
}