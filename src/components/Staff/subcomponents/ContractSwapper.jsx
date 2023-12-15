import {Autocomplete, Box, Button, Divider, Grid, Modal, TextField, Typography} from "@mui/material";
import {useContext, useState} from "react";
import * as React from "react";
import {getDriverName} from "../../../js/localization";
import {BasicInfoContext, DatabaseContext, MetadataContext, VersionContext} from "../../Contexts";
import {assignRandomRaceNumber, fireDriverContract, getStaff, swapDriverContracts} from "../commons/drivers";

export default function ContractSwapper(props) {
  const { swapRow, setSwapRow, refresh } = props;
  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);

  const ctx = { database, version, basicInfo };
  const [swapDriver, setSwapDriver] = useState(null);
  if (!swapRow) return null;

  const [_, _drivers] = getStaff(ctx, swapRow.StaffType);

  if (version === 2) {
    return (
      <Modal
        open={swapRow}
        onClose={() => setSwapRow(null)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#333',
          border: '2px solid #000',
          boxShadow: 24,
          padding: 15,
          borderRadius: 20,
        }}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Contract Swap is not supported for 2022 game.
          </Typography>
        </Box>
      </Modal>
    )
  }

  return (
    <Modal
      open={swapRow}
      onClose={() => setSwapRow(null)}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#333',
        border: '2px solid #000',
        boxShadow: 24,
        padding: 15,
        borderRadius: 20,
      }}>
        <Typography id="modal-modal-title" variant="h6" component="h2">
          Contract Swap for {getDriverName(swapRow)}
        </Typography>

        <Divider variant="fullWidth" sx={{ my: 2 }} />

        <Grid direction="row-reverse" container spacing={1}>
          <Grid item>
            <Button color="warning" variant="contained" sx={{ m: 1 }} onClick={() => {
              if (swapDriver && (swapRow.StaffID !== swapDriver.id)) {
                if (swapRow.StaffType === 0 && !swapDriver.number) {
                  assignRandomRaceNumber(ctx, swapDriver.id);
                }
                swapDriverContracts(ctx, swapRow.StaffID, swapDriver.id);
                refresh();
              }
            }} disabled={!swapDriver || (swapRow.StaffID === swapDriver.id)}>Swap</Button>
          </Grid>
          <Grid item>
          </Grid>
          <Grid item style={{ flex: 1 }}>
            <Autocomplete
              disablePortal
              options={_drivers.filter(x => x.StaffID !== swapRow.StaffID).map(r => ({
                label: getDriverName(r), id: r.StaffID, number: r.CurrentNumber
              }))}
              value={swapDriver}
              sx={{ width: 240, m: 0, display: "inline-block" }}
              onChange={ (e, nv) => setSwapDriver(nv)}
              renderInput={(params) => <TextField {...params} label="Swap with" autoComplete="off" />}
            />
          </Grid>
        </Grid>
        <Divider variant="fullWidth" sx={{ my: 2 }} />
        <div style={{ margin: 10 }}>
          <Button color="error" variant="contained" onClick={() => {
            fireDriverContract(ctx, swapRow.StaffID);
            refresh();
          }}>Fire {getDriverName(swapRow)}</Button>
        </div>
      </Box>
    </Modal>
  )
}