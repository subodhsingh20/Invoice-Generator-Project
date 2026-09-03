import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";

const items = [
  ["dashboard", "Dashboard", DashboardOutlined],
  ["new", "New Bill", ReceiptLongOutlined],
  ["invoices", "Archive", DescriptionOutlined],
  ["settings", "Settings", SettingsOutlined],
];

export default function MobileBottomNav({ value, onChange }) {
  return (
    <Paper className="mobile-bottom-nav" elevation={12}>
      <BottomNavigation value={value} onChange={(event, next) => onChange(next)} showLabels>
        {items.map(([screen, label, Icon]) => (
          <BottomNavigationAction key={screen} value={screen} label={label} icon={<Icon />} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
