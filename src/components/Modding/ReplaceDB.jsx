import {Button, Container, Typography} from "@mui/material";
import {useSnackbar} from "notistack";
import * as React from "react";
import Dropzone from "react-dropzone";
import {dump} from "../../js/fileAnalyzer";

export default function ReplaceDB({ database, basicInfo, metadata }) {
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
                enqueueSnackbar(
                  `The replaced savefile will begin downloading, but the database in website won't be replaced.`,
                  { variant: "warning" }
                );
                dump(db, metadata);
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
            <Container maxWidth="xl" component="main" sx={{ pt: 1, pb: 1 }}>
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