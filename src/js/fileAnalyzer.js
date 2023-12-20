import {Gvas, Serializer} from "./UESaveTool";

const pako = require("pako");
const { saveAs } = require("file-saver");

export const analyzeFileToDatabase = async (file) => {
  if (!window.SQL) return;

  return new Promise((resolve) => {

    if (file !== undefined) {
      let reader = new FileReader();
      reader.onload = async (e) => {
        const serial = new Serializer(Buffer.from(reader.result));
        const GVASMeta = new Gvas().deserialize(serial);
        const { Header, Properties } = GVASMeta;
        const { SaveGameVersion, EngineVersion } = Header;
        const { BuildId, Build } = EngineVersion;
        const version = SaveGameVersion; // TODO: will be incorrect for 2024
        /*

         */
        const gameVersionString = BuildId;

        let prettifiedGameVersion;
        switch (version) {
          case 3:
            prettifiedGameVersion = BuildId.substring(gameVersionString.indexOf("23+") + 3) + `.${Build & 0x7fffffff}`;
            break;
          case 2:
            prettifiedGameVersion = BuildId.substring(gameVersionString.indexOf("22_") + 3) + `.${Build & 0x7fffffff}`;
            break;
        }

        const careerSaveMetadata = {};

        const metadataProperty = Properties.Properties.filter(x => x.Name === "MetaData")[0];
        const careerSaveMetadataProperty = metadataProperty.Properties[0];

        careerSaveMetadataProperty.Properties.forEach(prop => {
          careerSaveMetadata[prop.Name] = prop.Property || prop.Properties;
        })

        const unk_zero = serial.readInt32();
        const total_size = serial.readInt32();
        const size_1 = serial.readInt32();
        const size_2 = serial.readInt32();
        const size_3 = serial.readInt32();

        const compressedData = serial.read(total_size);
        const output = pako.inflate(compressedData);
        const database_file = output.slice(0, size_1);

        // @ts-ignore

        if (window.db) window.db.close();
        const db = new window.SQL.Database(database_file);
        window.db = db;

        const metadata = {
          filename: file.name,
          version,
          gameVersionRaw: gameVersionString,
          gameVersion: prettifiedGameVersion,
          gvasMeta: GVASMeta,
          database_file,
          header: Header,
          properties: Properties,
          careerSaveMetadata,
          other_database: [{
            size: size_2,
            file: output.slice(size_1, size_1 + size_2),
          }, {
            size: size_3,
            file: output.slice(size_1 + size_2, size_1 + size_2 + size_3),
          }]
        }

        if (process.env.NODE_ENV === 'development') {
          console.log(db, version, Header, careerSaveMetadata)
          // saveAs(new Blob([metadata.chunk0], {type: "application/binary"}), "chunk0");
        }

        resolve({db, metadata});
      };
      reader.readAsArrayBuffer(file);
    }
  });
}

export const repack = (db, metadata, overwrite = false) => {
  const db_data = db.export();
  const db_size = db_data.length;

  const { other_database, gvasMeta } = metadata;

  const s1 = other_database[0].size;
  const s2 = other_database[1].size;

  const compressedData = new Buffer(db_size + s1 + s2);
  compressedData.set(db_data, 0);
  compressedData.set(other_database[0].file, db_size);
  compressedData.set(other_database[1].file, db_size + s1);

  const compressed = pako.deflate(compressedData);
  const compressed_size = compressed.length;

  const serialized = gvasMeta.serialize();
  const meta_length = serialized.length;

  const check = new Gvas().deserialize(
    new Serializer(Buffer.from(serialized))
  );

  if (JSON.stringify(gvasMeta) === JSON.stringify(check)) {
    const finalData = new Buffer(meta_length + 16 + compressed_size);

    finalData.set(serialized, 0);
    finalData.writeInt32LE(compressed_size, meta_length);
    finalData.writeInt32LE(db_size, meta_length + 4);
    finalData.writeInt32LE(s1, meta_length + 8);
    finalData.writeInt32LE(s2, meta_length + 12);
    finalData.set(compressed, meta_length + 16);

    if (window.mode === "app" && overwrite) {
      window.parent.document.dispatchEvent( new CustomEvent('export-file', {
        detail: {
          data: finalData,
          filename: metadata.filename,
          filepath: window.file_path,
        }
      }))
    } else {
      saveAs(new Blob([finalData], {type: "application/binary"}), metadata.filename);
    }
  }

}
export const dump = (db, metadata) => {
  saveAs(new Blob([db.export()], {type: "application/vnd.sqlite3"}), metadata.filename + ".db");
}