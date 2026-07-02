import { forwardRef } from "react";
import { AgGridReact, AgGridReactProps } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// AG Grid CSS
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Reusable custom CSS overrides for our glassmorphism dark theme
import "./DataGrid.css";

export const DataGrid = forwardRef<AgGridReact, AgGridReactProps>((props, ref) => {
  return (
    <div className="ag-theme-quartz custom-ag-grid h-full w-full">
      <AgGridReact
        ref={ref}
        rowHeight={48}
        headerHeight={40}
        suppressCellFocus={true}
        {...props}
      />
    </div>
  );
});

DataGrid.displayName = "DataGrid";
