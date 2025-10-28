// /**
//  * ThemePanel.test.tsx — no require(), typed mocks
//  */
// import * as React from "react";
// import { render, screen } from "@testing-library/react";
// import { ThemePanel } from "../ThemePanel";

// jest.mock("recharts", () => {
//   return {
//     ResponsiveContainer: (props: { children?: React.ReactNode }) =>
//       React.createElement(
//         "div",
//         { "data-testid": "responsive" },
//         props.children
//       ),
//     PieChart: (props: { children?: React.ReactNode }) =>
//       React.createElement("div", { "data-testid": "piechart" }, props.children),
//     Pie: (props: { children?: React.ReactNode }) =>
//       React.createElement("div", { "data-testid": "pie" }, props.children),
//     Cell: () => React.createElement("div", { "data-testid": "cell" }),
//     Tooltip: () => React.createElement("div", { "data-testid": "tooltip" }),
//   };
// });

// describe("ThemePanel", () => {
//   test("renders 'No theme data yet.' when data is empty", () => {
//     render(<ThemePanel data={[]} />);
//     expect(screen.getByText(/No theme data yet/i)).toBeInTheDocument();
//     expect(screen.getByTestId("responsive")).toBeInTheDocument();
//   });

//   test("renders legend items for provided data", () => {
//     const data = [
//       { name: "Teal", value: 3, color: "#2F6F66" },
//       { name: "Light", value: 5, color: "#c96a2b" },
//     ];
//     render(<ThemePanel data={data} />);
//     expect(screen.getByText(/Teal — 3/i)).toBeInTheDocument();
//     expect(screen.getByText(/Light — 5/i)).toBeInTheDocument();
//     expect(screen.getByTestId("piechart")).toBeInTheDocument();
//   });
// });
