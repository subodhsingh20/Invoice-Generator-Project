import { memo } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined";

// Memoized: its only prop is the driver logo, which stays referentially stable
// between form keystrokes, so React skips re-rendering this block each time.
function ReceiptBrand({ logo, title, titleVariant = "h3" }) {
  return (
    <Stack direction="row" spacing={1.5} className="receipt-brand">
      {logo?.logoData ? (
        <img
          src={logo.logoData}
          alt="Driver business logo"
          className="receipt-logo"
        />
      ) : (
        <Box className="receipt-logo default-receipt-logo">
          <DirectionsCarOutlined fontSize="small" />
        </Box>
      )}
      <Box>
        <Typography className="receipt-label">EASY BILL</Typography>
        <Typography variant={titleVariant} className="receipt-title">
          {title}
        </Typography>
      </Box>
    </Stack>
  );
}

export default memo(ReceiptBrand);
