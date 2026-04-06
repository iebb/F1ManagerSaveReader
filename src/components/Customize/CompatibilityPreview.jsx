import {Box, Chip, Stack, Tooltip, Typography} from "@mui/material";
import * as React from "react";

const LANGUAGES = [
  {key: "Lat", label: "Latin"},
  {key: "Rus", label: "Russian"},
  {key: "Chn", label: "Chinese"},
  {key: "Jpn", label: "Japanese"},
];

function getCharacterTone(info) {
  const supported = LANGUAGES.filter((language) => info[language.key]).length;
  if (supported === LANGUAGES.length) {
    return {
      backgroundColor: "success.dark",
      borderColor: "success.light",
      color: "success.contrastText",
    };
  }
  if (supported === 0) {
    return {
      backgroundColor: "error.dark",
      borderColor: "error.light",
      color: "error.contrastText",
    };
  }
  return {
    backgroundColor: "warning.dark",
    borderColor: "warning.light",
    color: "warning.contrastText",
  };
}

export default function CompatibilityPreview({compatibility}) {
  return (
    <Box sx={{mt: 2}}>
      <Typography variant="body2" sx={{mb: 1.5}}>
        Characters that may fail in some languages are highlighted directly below.
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{mb: 2}}>
        {compatibility.Characters.map((info, index) => {
          if (info.separator) {
            return <Box key={`separator-${index}`} sx={{width: 12}} />;
          }

          const supportedLabels = LANGUAGES.filter((language) => info[language.key]).map((language) => language.label);
          const missingLabels = LANGUAGES.filter((language) => !info[language.key]).map((language) => language.label);
          const tone = getCharacterTone(info);

          return (
            <Tooltip
              key={`${info.char}-${index}`}
              title={missingLabels.length ? `Missing: ${missingLabels.join(", ")}` : "Supported in all languages"}
            >
              <Box
                sx={{
                  minWidth: 36,
                  height: 36,
                  px: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: 1,
                  borderRadius: 1,
                  fontSize: 18,
                  lineHeight: 1,
                  ...tone,
                }}
              >
                {info.char}
              </Box>
            </Tooltip>
          );
        })}
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip size="small" label="All languages" color="success" variant="outlined" />
        <Chip size="small" label="Some languages" color="warning" variant="outlined" />
        <Chip size="small" label="Unsupported everywhere" color="error" variant="outlined" />
      </Stack>
    </Box>
  );
}
