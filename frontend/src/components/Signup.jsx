import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import LockOutlined from "@mui/icons-material/LockOutlined"
import AlternateEmailOutlined from "@mui/icons-material/AlternateEmailOutlined"
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined"
import PersonOutlineOutlined from "@mui/icons-material/PersonOutlineOutlined"
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined"
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined"
import { motion } from "framer-motion"
import { useState } from "react"

export default function Signup({ form, errors, loading, onChange, onSubmit, onSwitchToLogin }) {
  const [showPassword, setShowPassword] = useState(false)
  return (
    <Paper className="auth-card" elevation={0}>
      <Stack spacing={2.5}>
        <Box className="auth-logo"><DirectionsCarOutlined /></Box>
        <Box>
          <Typography className="auth-kicker">DRIVER ACCESS</Typography>
          <Typography component="h1" className="auth-title">Sign up</Typography>
          <Typography className="auth-copy">Create your driver account to unlock the dashboard.</Typography>
        </Box>
        <Stack spacing={2} component="form" onSubmit={onSubmit}>
          <TextField label="Driver name" value={form.driverName} onChange={onChange("driverName")} error={Boolean(errors.driverName)} helperText={errors.driverName || " "} fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonOutlineOutlined /></InputAdornment> } }} />
          <TextField label="Email" type="email" value={form.email} onChange={onChange("email")} error={Boolean(errors.email)} helperText={errors.email || " "} fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start"><AlternateEmailOutlined /></InputAdornment> } }} />
          <TextField label="Password" type={showPassword ? "text" : "password"} value={form.password} onChange={onChange("password")} error={Boolean(errors.password)} helperText={errors.password || " "} fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start"><LockOutlined /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} edge="end">{showPassword ? <VisibilityOffOutlined /> : <VisibilityOutlined />}</IconButton></InputAdornment> } }} />
          <TextField label="Vehicle number" value={form.vehicleNumber} onChange={onChange("vehicleNumber")} error={Boolean(errors.vehicleNumber)} helperText={errors.vehicleNumber || " "} fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start"><DirectionsCarOutlined /></InputAdornment> } }} />
          <motion.div whileTap={{ scale: 0.97 }} whileHover={{ y: -2 }}><Button variant="contained" type="submit" disabled={loading} fullWidth>{loading ? "Creating..." : "Create account"}</Button></motion.div>
        </Stack>
        <motion.div whileTap={{ scale: 0.98 }}><Button className="auth-switch" variant="text" onClick={onSwitchToLogin}>Already have an account</Button></motion.div>
      </Stack>
    </Paper>
  )
}
