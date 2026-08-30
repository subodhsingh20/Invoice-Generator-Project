import { memo } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import RefreshOutlined from "@mui/icons-material/RefreshOutlined";

function FilterBar({ filters, setFilters, onRefresh, loading }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
      className="filter-bar"
    >
      <TextField
        type="date"
        label="From"
        value={filters.from}
        onChange={(event) =>
          setFilters((current) => ({ ...current, from: event.target.value }))
        }
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        type="date"
        label="To"
        value={filters.to}
        onChange={(event) =>
          setFilters((current) => ({ ...current, to: event.target.value }))
        }
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Button
        variant="contained"
        startIcon={<RefreshOutlined />}
        onClick={onRefresh}
        disabled={loading}
      >
        Refresh
      </Button>
    </Stack>
  );
}

export default memo(FilterBar);
