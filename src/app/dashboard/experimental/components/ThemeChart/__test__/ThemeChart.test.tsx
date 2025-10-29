// /**
//  * ThemeChart.test.tsx — no require(), typed props only
//  */
// import * as React from "react";
// import { render, screen } from "@testing-library/react";
// // import { ThemeChart } from "../ThemeChart";

// // Mock recharts using the imported React (no require)
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

// describe("ThemeChart", () => {
//   test("renders empty chart area and heading when there are no users", () => {
//     render(<ThemeChart users={[]} />);

//     expect(screen.getByText(/Theme distribution/i)).toBeInTheDocument();
//     expect(screen.getByTestId("responsive")).toBeInTheDocument();
//     expect(screen.getByTestId("piechart")).toBeInTheDocument();
//     expect(screen.getByTestId("tooltip")).toBeInTheDocument();
//   });

//   test("computes distribution and renders legend items", () => {
//     const users: Array<{
//       id: string;
//       name: string;
//       theme: { name: string; color: string };
//     }> = [
//       { id: "1", name: "A", theme: { name: "Teal", color: "#2F6F66" } },
//       { id: "2", name: "B", theme: { name: "Teal", color: "#2F6F66" } },
//       { id: "3", name: "C", theme: { name: "Dark", color: "#000000" } },
//     ];

//     render(<ThemeChart users={users} />);

//     expect(screen.getByText(/Teal — 2/i)).toBeInTheDocument();
//     expect(screen.getByText(/Dark — 1/i)).toBeInTheDocument();
//     expect(screen.getAllByTestId("cell").length).toBeGreaterThanOrEqual(2);
//   });
// });
