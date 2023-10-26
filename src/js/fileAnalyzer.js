const pako = require("pako");
const { saveAs } = require("file-saver");

const toInteger = (x) => {
  return ((
      x.charCodeAt(3) * 256 +
      x.charCodeAt(2)) * 256 +
    x.charCodeAt(1)) * 256 + x.charCodeAt(0);
}
export const analyzeFileToDatabase = async (file) => {
  return new Promise((resolve) => {

    if (file !== undefined) {
      let reader = new FileReader();
      reader.onload = async () => {
        const data= reader.result;
        const version = data.charCodeAt(4);
        const metaLength = data.indexOf("\x00\x05\x00\x00\x00\x4E\x6F\x6E\x65\x00\x05\x00\x00\x00\x4E\x6F\x6E\x65\x00\x00\x00\x00\x00") + 19 + 4;

        const size_0 = toInteger(data.slice(metaLength, metaLength + 4));
        const size_1 = toInteger(data.slice(metaLength + 4, metaLength + 8));
        const size_2 = toInteger(data.slice(metaLength + 8, metaLength + 12));
        const size_3 = toInteger(data.slice(metaLength + 12, metaLength + 16));

        const remainingData = data.slice(metaLength + 16);

        let compressedData = Uint8Array.from(remainingData, (c) => c.charCodeAt(0));

        const pako = require('pako');
        const output = pako.inflate(compressedData);
        const database_file = output.slice(0, size_1);

        // @ts-ignore
        require('sql.js')({locateFile: f => `https://sql.js.org/dist/${f}`}).then(SQL => {
          const db = new SQL.Database(database_file);
          resolve({db, version});
        });


        window.DumpDB = () => saveAs(new Blob([database_file], {type: "application/vnd.sqlite3"}), "data.db");

      };
      reader.readAsBinaryString(file);
    }
  });
}