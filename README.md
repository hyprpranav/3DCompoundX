# Realistic 3D Electric Components Viewer

This project is a web-based viewer for realistic 3D models of electric components using Three.js. It allows users to interact with and visualize various electronic parts, upload component data via Excel files, and adjust values for simulation.

## Features
- 3D visualization of basic components (resistor, capacitor, inductor, diode, LED, transistor types, breadboard, wire)
- Power sources (DC, AC, battery, battery pack, solar panel)
- Motors (DC, stepper, servo)
- Interactive controls for rotating, zooming, and toggling info
- Value panels for customizing component parameters
- Upload component data from `.xlsx` files

## Usage
1. Open `index.html` in your browser.
2. Use the navigation panel to select and view components.
3. Adjust values using the value panels.
4. Upload component data if needed.

## Technologies
- [Three.js](https://threejs.org/) for 3D rendering
- [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls) for navigation
- [SheetJS/xlsx](https://github.com/SheetJS/sheetjs) for Excel file parsing

## How to Run
Just open `index.html` in any modern browser. No server required.

## License
MIT
