import { memo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ImageOutlined from "@mui/icons-material/ImageOutlined";
import PageIntro from "./PageIntro.jsx";

function QrSettings({
  qr,
  qrLoading,
  saveQr,
  logo,
  logoLoading,
  saveLogo,
  deleteLogo,
  profile,
  onOpenAccount,
}) {
  return (
    <>
      <PageIntro
        eyebrow="SETTINGS"
        step="04"
        title="Payment and branding"
        copy="Manage the QR code and logo shown on each bill."
        compact
      />
      <Box className="settings-grid">
        <Paper className="settings-panel" elevation={0}>
          <Stack spacing={2.5}>
            <Box>
              <Typography component="h2" className="panel-title">Account</Typography>
              <Typography className="panel-subtitle">View profile details and manage your driver account</Typography>
            </Box>
            <Box className="account-card">
              <Typography className="account-label">Driver name</Typography>
              <Typography className="account-value">{profile?.driverName || "Not available"}</Typography>
              <Typography className="account-label">Email</Typography>
              <Typography className="account-value">{profile?.email || "Not available"}</Typography>
              <Typography className="account-label">Vehicle number</Typography>
              <Typography className="account-value">{profile?.vehicleNumber || "Not available"}</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" onClick={onOpenAccount}>Delete account</Button>
            </Stack>
          </Stack>
        </Paper>
        <Paper className="settings-panel" elevation={0}>
          <Stack spacing={2.5}>
            <Box>
              <Typography component="h2" className="panel-title">UPI payment code</Typography>
              <Typography className="panel-subtitle">PNG or JPG, up to 2 MB</Typography>
            </Box>
            {qr && <img src={qr.imageData} alt="Saved UPI payment QR code preview" className="qr-preview" />}
            <Button component="label" variant="contained" disabled={qrLoading}>
              {qr ? "Replace QR" : "Upload QR code"}
              <input hidden type="file" accept="image/png,image/jpeg" onChange={saveQr} />
            </Button>
            {qr && <Typography className="panel-subtitle">Last updated {new Date(qr.updatedAt).toLocaleString()}</Typography>}
          </Stack>
        </Paper>
        <Paper className="settings-panel" elevation={0}>
          <Stack spacing={2.5}>
            <Box>
              <Typography component="h2" className="panel-title">Upload Logo</Typography>
              <Typography className="panel-subtitle">PNG, JPG, or SVG, up to 2 MB</Typography>
            </Box>
            {logo?.logoData ? (
              <img src={logo.logoData} alt="Uploaded bill logo preview" className="logo-preview" />
            ) : (
              <Box className="logo-preview default-logo-preview">
                <ImageOutlined />
                <Typography>Aura Men Billing Service Portal</Typography>
              </Box>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button component="label" variant="contained" disabled={logoLoading}>
                {logo?.logoData ? "Update Logo" : "Upload Logo"}
                <input hidden type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={saveLogo} />
              </Button>
              <Button variant="outlined" color="error" onClick={deleteLogo} disabled={logoLoading || !logo?.logoData}>
                Delete Logo
              </Button>
            </Stack>
            {logo?.updatedAt && <Typography className="panel-subtitle">Last updated {new Date(logo.updatedAt).toLocaleString()}</Typography>}
          </Stack>
        </Paper>
      </Box>
    </>
  );
}

export default memo(QrSettings);
