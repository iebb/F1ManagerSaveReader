import {Container, Typography} from "@mui/material";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext} from "react";
import Dropzone from "react-dropzone";
import {DatabaseUpdaterContext, MetadataContext} from "../Contexts";

export default function ReplaceDB() {
  const replaceDatabase = useContext(DatabaseUpdaterContext);

  const { enqueueSnackbar } = useSnackbar();

  return (
    <div>
      <Dropzone
        onDropAccepted={files => {
          const file = files[0];
          if (file !== undefined) {
            let reader = new FileReader();
            reader.onload = async (e) => {
              const database_file = reader.result;
              try {
                const db = new window.SQL.Database(database_file);
                let [{ values }] = db.exec("SELECT * FROM Player");
                enqueueSnackbar(
                  `Hello ${values[0][0]} ${values[0][1]}!`,
                  { variant: "success" }
                );
                replaceDatabase(db);
                enqueueSnackbar(
                  `The database has been replaced. Use at your own risk!`,
                  { variant: "warning" }
                );
              } catch (ex) {
                enqueueSnackbar(
                  "Is it a valid database file? Error:" + ex,
                  { variant: "danger" }
                );
              }
            }
            reader.readAsBinaryString(file);
          }
        }}
        multiple={false}
      >
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()}>
            <Container maxWidth={false} component="main">
              <input {...getInputProps()} hidden />
              <div className="dropzone">
                <Typography variant="h5" component="h5">
                  Click or Drag a database file here to replace.
                </Typography>
              </div>
            </Container>
          </div>
        )}
      </Dropzone>
    </div>
  );
}