// XLSX Processing Variables
let gk_isXlsx = false;
let gk_xlsxFileLookup = {};
let gk_fileData = {};

function filledCell(cell) {
    return cell !== '' && cell != null;
}

function loadFileData(filename) {
    if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
        try {
            const workbook = XLSX.read(gk_fileData[filename], { type: 'base64' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert sheet to JSON to filter blank rows
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
            // Filter out blank rows
            const filteredData = jsonData.filter(row => row.some(filledCell));

            // Heuristic to find the header row
            let headerRowIndex = filteredData.findIndex((row, index) =>
                row.filter(filledCell).length >= filteredData[index + 1]?.filter(filledCell).length
            );
            if (headerRowIndex === -1 || headerRowIndex > 25) {
                headerRowIndex = 0;
            }

            // Convert filtered JSON back to CSV
            const csv = XLSX.utils.aoa_to_sheet(filteredData.slice(headerRowIndex));
            return XLSX.utils.sheet_to_csv(csv, { header: 1 });
        } catch (e) {
            console.error('Error processing XLSX file:', e);
            return "";
        }
    }
    return gk_fileData[filename] || "";
}

// Process uploaded XLSX file
function processXLSXFile() {
    const input = document.getElementById('xlsx-upload');
    const file = input.files[0];
    if (!file) {
        alert('Please select an XLSX file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = e.target.result;
        const filename = file.name;

        // Convert ArrayBuffer to base64
        const base64Data = btoa(
            new Uint8Array(data).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // Store file data
        gk_isXlsx = filename.endsWith('.xlsx');
        gk_xlsxFileLookup[filename] = true;
        gk_fileData[filename] = base64Data;

        // Process the file
        const csvData = loadFileData(filename);
        if (csvData) {
            updateComponentsFromCSV(csvData);
        } else {
            alert('Failed to process XLSX file.');
        }
    };
    reader.readAsArrayBuffer(file);
}

// Update components from CSV data
function updateComponentsFromCSV(csvData) {
    const rows = csvData.split('\n').map(row => row.split(','));
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const componentIndex = headers.indexOf('component');
    const valueIndex = headers.indexOf('value');
    const toleranceIndex = headers.indexOf('tolerance');
    const colorIndex = headers.indexOf('color');

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const component = row[componentIndex]?.trim().toLowerCase();
        const value = row[valueIndex]?.trim();
        const tolerance = row[toleranceIndex]?.trim();
        const color = row[colorIndex]?.trim();

        switch (component) {
            case 'resistor':
                if (value && tolerance) {
                    document.getElementById('resistor-value').value = parseFloat(value);
                    document.getElementById('resistor-tolerance').value = tolerance;
                    updateResistorValue();
                }
                break;
            case 'capacitor':
                if (value) {
                    capacitorValue = parseFloat(value);
                    document.getElementById('capacitor-value').value = capacitorValue;
                    updateCapacitorValue();
                }
                break;
            case 'inductor':
                if (value) {
                    inductorValue = parseFloat(value);
                    document.getElementById('inductor-value').value = inductorValue;
                    updateInductorValue();
                }
                break;
            case 'led':
                if (color) {
                    document.getElementById('led-color-picker').value = color;
                    updateLEDColor();
                }
                break;
            case 'dcsource':
                if (value) {
                    dcSourceVoltage = parseFloat(value);
                    document.getElementById('dcsource-voltage').value = dcSourceVoltage;
                    updateDCSourceVoltage();
                }
                break;
            case 'acsource':
                if (value) {
                    acSourceVoltage = parseFloat(value);
                    document.getElementById('acsource-voltage').value = acSourceVoltage;
                    updateACSourceVoltage();
                }
                break;
        }
    }

    // Refresh the current component view
    showComponent(currentType);
}

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121212);

const camera = new THREE.PerspectiveCamera(60, (window.innerWidth - 280) / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth - 280, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('viewer-container').appendChild(renderer.domElement);

// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.enablePan = false;
controls.minDistance = 1.5;
controls.maxDistance = 8;

// Environment map for reflections
const cubeTextureLoader = new THREE.CubeTextureLoader();
const envMap = cubeTextureLoader.load([
    'https://threejs.org/examples/textures/cube/Bridge2/posx.jpg',
    'https://threejs.org/examples/textures/cube/Bridge2/negx.jpg',
    'https://threejs.org/examples/textures/cube/Bridge2/posy.jpg',
    'https://threejs.org/examples/textures/cube/Bridge2/negy.jpg',
    'https://threejs.org/examples/textures/cube/Bridge2/posz.jpg',
    'https://threejs.org/examples/textures/cube/Bridge2/negz.jpg'
], () => {
    scene.environment = envMap;
}, undefined, (err) => {
    console.error('Failed to load environment map:', err);
});

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(2, 2, 2);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 0.6, 10);
pointLight.position.set(-1, 1, 3);
scene.add(pointLight);

// Grid helper
const gridHelper = new THREE.GridHelper(8, 8, 0x37474f, 0x263238);
gridHelper.position.y = -0.3;
scene.add(gridHelper);

// Current component and animation state
let currentComponent = null;
let animationEnabled = true;
let rotationSpeed = 0.01;
let currentType = 'resistor';
let resistorBands = [0x8B4513, 0x000000, 0xFF0000, 0xDAA520]; // Brown, Black, Red, Gold
let ledColor = 0x00FF00; // Default green
let dcSourceVoltage = 12;
let acSourceVoltage = 12;
let capacitorValue = 100; // μF
let inductorValue = 10; // mH
let wireStretch = 0.5; // For stretchable wire

// Material helpers
function createMetalMaterial(color, roughness = 0.3, metalness = 0.8) {
    return new THREE.MeshStandardMaterial({
        color: color,
        roughness: roughness,
        metalness: metalness,
        envMap: envMap,
        envMapIntensity: 0.9
    });
}

function createPlasticMaterial(color, roughness = 0.5) {
    return new THREE.MeshStandardMaterial({
        color: color,
        roughness: roughness,
        metalness: 0.1,
        envMap: envMap,
        envMapIntensity: 0.5
    });
}

function createGlassMaterial(color, opacity = 0.9) {
    return new THREE.MeshPhysicalMaterial({
        color: color,
        transmission: 0.95,
        roughness: 0.05,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        ior: 1.5,
        thickness: 0.2,
        transparent: true,
        opacity: opacity,
        envMap: envMap,
        envMapIntensity: 0.9
    });
}

// Texture loader
const textureLoader = new THREE.TextureLoader();

// Show loading indicator
function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

// Hide loading indicator
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Resistor color code logic
const colorMap = {
    'black': { digit: 0, multiplier: 1, color: 0x000000 },
    'brown': { digit: 1, multiplier: 10, tolerance: 1, color: 0x8B4513 },
    'red': { digit: 2, multiplier: 100, tolerance: 2, color: 0xFF0000 },
    'orange': { digit: 3, multiplier: 1000, color: 0xFFA500 },
    'yellow': { digit: 4, multiplier: 10000, color: 0xFFFF00 },
    'green': { digit: 5, multiplier: 100000, tolerance: 0.5, color: 0x00FF00 },
    'blue': { digit: 6, multiplier: 1000000, tolerance: 0.25, color: 0x0000FF },
    'violet': { digit: 7, multiplier: 10000000, tolerance: 0.1, color: 0xEE82EE },
    'gray': { digit: 8, multiplier: 100000000, tolerance: 0.05, color: 0x808080 },
    'white': { digit: 9, multiplier: 1000000000, color: 0xFFFFFF },
    'gold': { multiplier: 0.1, tolerance: 5, color: 0xDAA520 },
    'silver': { multiplier: 0.01, tolerance: 10, color: 0xC0C0C0 },
    'none': { tolerance: 20, color: null }
};

function calculateResistorColors(value, tolerance) {
    if (value < 1) return null;
    let numStr = value.toString().replace('.', '');
    let digits = numStr.split('').map(Number);
    let firstDigit = digits[0];
    let secondDigit = digits[1] || 0;
    let multiplierPower = Math.log10(value / (firstDigit * 10 + secondDigit));
    multiplierPower = Math.round(multiplierPower);

    let bandColors = [];
    bandColors.push(Object.keys(colorMap).find(key => colorMap[key].digit === firstDigit));
    bandColors.push(Object.keys(colorMap).find(key => colorMap[key].digit === secondDigit));
    bandColors.push(Object.keys(colorMap).find(key => colorMap[key].multiplier === Math.pow(10, multiplierPower)));
    bandColors.push(Object.keys(colorMap).find(key => colorMap[key].tolerance === parseFloat(tolerance)));

    return {
        colors: bandColors.map(color => colorMap[color].color),
        description: `${bandColors[0].charAt(0).toUpperCase() + bandColors[0].slice(1)}-${bandColors[1].charAt(0).toUpperCase() + bandColors[1].slice(1)}-${bandColors[2].charAt(0).toUpperCase() + bandColors[2].slice(1)}-${bandColors[3].charAt(0).toUpperCase() + bandColors[3].slice(1)} (${(firstDigit * 10 + secondDigit) * Math.pow(10, multiplierPower)}Ω ±${tolerance}%)`
    };
}

// Update resistor value
function updateResistorValue() {
    const value = parseFloat(document.getElementById('resistor-value').value);
    const tolerance = document.getElementById('resistor-tolerance').value;
    const result = calculateResistorColors(value, tolerance);
    if (result) {
        resistorBands = result.colors;
        document.getElementById('resistor-color-code').textContent = result.description;
        showResistor();
    } else {
        alert('Invalid resistor value');
    }
}

// Update capacitor value
function updateCapacitorValue() {
    capacitorValue = parseFloat(document.getElementById('capacitor-value').value);
    document.getElementById('capacitor-value').textContent = `${capacitorValue}μF`;
    showCapacitor();
}

// Update inductor value
function updateInductorValue() {
    inductorValue = parseFloat(document.getElementById('inductor-value').value);
    document.getElementById('inductor-value').textContent = `${inductorValue}mH`;
    showInductor();
}

// Update LED color
function updateLEDColor() {
    const colorHex = document.getElementById('led-color-picker').value;
    ledColor = parseInt(colorHex.replace('#', '0x'), 16);
    const colorName = getColorName(colorHex);
    document.getElementById('led-color').textContent = colorName;
    document.getElementById('led-wavelength').textContent = getWavelength(colorHex);
    showLED();
}

// Approximate color name from hex
function getColorName(hex) {
    const colors = {
        '#FF0000': 'Red',
        '#00FF00': 'Green',
        '#0000FF': 'Blue',
        '#FFFFFF': 'White',
        '#FFFF00': 'Yellow',
        '#FF00FF': 'Magenta',
        '#00FFFF': 'Cyan'
    };
    return colors[hex.toUpperCase()] || 'Custom';
}

// Approximate wavelength from hex
function getWavelength(hex) {
    const wavelengths = {
        '#FF0000': '620-630nm',
        '#00FF00': '515-530nm',
        '#0000FF': '465-475nm',
        '#FFFFFF': 'Broad spectrum',
        '#FFFF00': '570-590nm',
        '#FF00FF': '390-405nm',
        '#00FFFF': '490-500nm'
    };
    return wavelengths[hex.toUpperCase()] || 'Varies';
}

// Update DC source voltage
function updateDCSourceVoltage() {
    dcSourceVoltage = parseFloat(document.getElementById('dcsource-voltage').value);
    document.getElementById('dcsource-voltage').textContent = `${dcSourceVoltage.toFixed(1)}V`;
    showDCSource();
}

// Update AC source voltage
function updateACSourceVoltage() {
    acSourceVoltage = parseFloat(document.getElementById('acsource-voltage').value);
    document.getElementById('acsource-voltage').textContent = `${acSourceVoltage.toFixed(1)}V`;
    showACSource();
}

// Toggle transistor sub-menu
function toggleTransistorMenu() {
    const subMenu = document.getElementById('transistor-sub-menu');
    subMenu.classList.toggle('active');
    document.querySelector('.component-btn[data-type="transistor"]').classList.toggle('active');
}

// Clear current component
function clearCurrentComponent() {
    if (currentComponent) {
        scene.remove(currentComponent);
        currentComponent = null;
    }
}

// Show component
async function showComponent(type) {
    currentType = type;
    document.querySelectorAll('.component-btn, .sub-btn').forEach(btn => btn.classList.remove('active'));
    const mainBtn = document.querySelector(`.component-btn[data-type="${type}"]`);
    const subBtn = document.querySelector(`.sub-btn[data-type="${type}"]`);
    if (mainBtn) mainBtn.classList.add('active');
    if (subBtn) {
        subBtn.classList.add('active');
        document.getElementById('transistor-sub-menu').classList.add('active');
        document.querySelector('.component-btn[data-type="transistor"]').classList.add('active');
    }

    switch (type) {
        case 'resistor': await showResistor(); break;
        case 'capacitor': await showCapacitor(); break;
        case 'inductor': await showInductor(); break;
        case 'diode': await showDiode(); break;
        case 'led': await showLED(); break;
        case 'bjt': await showBJT(); break;
        case 'fet': await showFET(); break;
        case 'mosfet': await showMOSFET(); break;
        case 'jfet': await showJFET(); break;
        case 'igbt': await showIGBT(); break;
        case 'ujt': await showUJT(); break;
        case 'phototransistor': await showPhototransistor(); break;
        case 'dcsource': await showDCSource(); break;
        case 'acsource': await showACSource(); break;
        case 'battery': await showBattery(); break;
        case 'batterypack': await showBatteryPack(); break;
        case 'solarpanel': await showSolarPanel(); break;
        case 'dcmotor': await showDCMotor(); break;
        case 'steppermotor': await showStepperMotor(); break;
        case 'servomotor': await showServoMotor(); break;
        case 'breadboard': await showBreadboard(); break;
        case 'wire': await showWire(); break;
    }
}

// Show info panel
function showInfo(type) {
    document.querySelectorAll('.compound-info').forEach(info => info.classList.remove('active'));
    const infoPanel = document.getElementById(`${type}-info`);
    if (infoPanel) infoPanel.classList.add('active');
}

// Show value panel
function showValuePanel(type) {
    document.querySelectorAll('#value-panel > div').forEach(panel => panel.style.display = 'none');
    const valuePanel = document.getElementById(`${type}-value-panel`);
    if (valuePanel) {
        valuePanel.style.display = 'block';
        document.getElementById('value-panel').style.display = 'block';
    } else {
        document.getElementById('value-panel').style.display = 'none';
    }
}

// Reset view
function resetView() {
    camera.position.set(0, 1, 4);
    controls.target.set(0, 0.5, 0);
    controls.update();
}

// Toggle info panels
function toggleInfo() {
    document.querySelectorAll('.compound-info').forEach(info => {
        info.classList.toggle('active');
    });
}

// Toggle animation
function toggleAnimation() {
    animationEnabled = !animationEnabled;
}

// Resistor
async function showResistor() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body (ceramic)
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 32);
    const bodyMaterial = createPlasticMaterial(0xD2B48C, 0.4);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // End caps
    const capGeometry = new THREE.CylinderGeometry(0.21, 0.21, 0.1, 32);
    const capMaterial = createMetalMaterial(0xC0C0C0, 0.2, 0.9);
    const leftCap = new THREE.Mesh(capGeometry, capMaterial);
    leftCap.rotation.z = Math.PI / 2;
    leftCap.position.x = -0.65;
    leftCap.castShadow = true;
    group.add(leftCap);

    const rightCap = leftCap.clone();
    rightCap.position.x = 0.65;
    group.add(rightCap);

    // Color bands
    const bandGeometry = new THREE.CylinderGeometry(0.205, 0.205, 0.08, 32);
    const bandPositions = [-0.4, -0.2, 0.2, 0.4];

    bandPositions.forEach((pos, i) => {
        const bandMaterial = createPlasticMaterial(resistorBands[i], 0.3);
        const band = new THREE.Mesh(bandGeometry, bandMaterial);
        band.rotation.z = Math.PI / 2;
        band.position.x = pos;
        band.castShadow = true;
        group.add(band);
    });

    // Leads
    const leadGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 16);
    const leadMaterial = createMetalMaterial(0xB0B0B0, 0.4, 0.7);
    const leftLead = new THREE.Mesh(leadGeometry, leadMaterial);
    leftLead.rotation.z = Math.PI / 2;
    leftLead.position.x = -1.2;
    leftLead.castShadow = true;
    group.add(leftLead);

    const rightLead = leftLead.clone();
    rightLead.position.x = 1.2;
    group.add(rightLead);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('resistor');
    showValuePanel('resistor');
    resetView();
    hideLoading();
}

// Capacitor
async function showCapacitor() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body (electrolytic)
    const bodyGeometry = new THREE.CylinderGeometry(0.35, 0.35, 1.4, 32);
    const bodyMaterial = createMetalMaterial(0xA9A9A9, 0.3, 0.8);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // Label wrap
    const wrapGeometry = new THREE.CylinderGeometry(0.355, 0.355, 1.0, 32);
    const wrapMaterial = createPlasticMaterial(0xF5F5F5, 0.2);
    const wrap = new THREE.Mesh(wrapGeometry, wrapMaterial);
    wrap.rotation.z = Math.PI / 2;
    wrap.castShadow = true;
    group.add(wrap);

    // Negative stripe
    const stripeGeometry = new THREE.CylinderGeometry(0.356, 0.356, 0.12, 32);
    const stripeMaterial = createPlasticMaterial(0x000000, 0.1);
    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe.rotation.z = Math.PI / 2;
    stripe.position.x = -0.5;
    stripe.castShadow = true;
    group.add(stripe);

    // Leads
    const leadGeometry = new THREE.CylinderGeometry(0.025, 0.025, 1.2, 16);
    const leadMaterial = createMetalMaterial(0xB0B0B0, 0.4, 0.7);
    const negLead = new THREE.Mesh(leadGeometry, leadMaterial);
    negLead.rotation.z = Math.PI / 2;
    negLead.position.x = -1.1;
    negLead.castShadow = true;
    group.add(negLead);

    const posLead = new THREE.Mesh(leadGeometry, leadMaterial);
    posLead.rotation.z = Math.PI / 2;
    posLead.position.x = 1.1;
    posLead.scale.y = 1.3;
    posLead.castShadow = true;
    group.add(posLead);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('capacitor');
    showValuePanel('capacitor');
    resetView();
    hideLoading();
}

// Inductor
async function showInductor() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Core (ferrite)
    const coreGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1.0, 32);
    const coreMaterial = createPlasticMaterial(0x4A3721, 0.6);
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.rotation.z = Math.PI / 2;
    core.castShadow = true;
    group.add(core);

    // Coil (wrapped wire)
    const coilGeometry = new THREE.TorusGeometry(0.27, 0.03, 12, 50);
    const coilMaterial = createMetalMaterial(0xB87333, 0.5, 0.6);
    for (let i = -0.4; i <= 0.4; i += 0.1) {
        const coil = new THREE.Mesh(coilGeometry, coilMaterial);
        coil.rotation.z = Math.PI / 2;
        coil.position.x = i;
        coil.castShadow = true;
        group.add(coil);
    }

    // Leads
    const leadGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 16);
    const leadMaterial = createMetalMaterial(0xB0B0B0, 0.4, 0.7);
    const leftLead = new THREE.Mesh(leadGeometry, leadMaterial);
    leftLead.rotation.z = Math.PI / 2;
    leftLead.position.x = -1.0;
    leftLead.castShadow = true;
    group.add(leftLead);

    const rightLead = leftLead.clone();
    rightLead.position.x = 1.0;
    group.add(rightLead);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('inductor');
    showValuePanel('inductor');
    resetView();
    hideLoading();
}

// Diode
async function showDiode() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body (black plastic)
    const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.7, 32);
    const bodyMaterial = createPlasticMaterial(0x000000, 0.4);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // Cathode band
    const bandGeometry = new THREE.CylinderGeometry(0.155, 0.155, 0.1, 32);
    const bandMaterial = createPlasticMaterial(0xC0C0C0, 0.2);
    const band = new THREE.Mesh(bandGeometry, bandMaterial);
    band.rotation.z = Math.PI / 2;
    band.position.x = 0.25;
    band.castShadow = true;
    group.add(band);

    // Leads
    const leadGeometry = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 16);
    const leadMaterial = createMetalMaterial(0xB0B0B0, 0.4, 0.7);
    const anodeLead = new THREE.Mesh(leadGeometry, leadMaterial);
    anodeLead.rotation.z = Math.PI / 2;
    anodeLead.position.x = -1.0;
    anodeLead.castShadow = true;
    group.add(anodeLead);

    const cathodeLead = anodeLead.clone();
    cathodeLead.position.x = 1.0;
    group.add(cathodeLead);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('diode');
    showValuePanel('diode');
    resetView();
    hideLoading();
}

// LED
async function showLED() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Lens (epoxy)
    const lensGeometry = new THREE.SphereGeometry(0.4, 64, 64);
    const lensMaterial = createGlassMaterial(ledColor, 0.95);
    lensMaterial.emissive = new THREE.Color(ledColor);
    lensMaterial.emissiveIntensity = 0.8;
    const lens = new THREE.Mesh(lensGeometry, lensMaterial);
    lens.castShadow = true;
    group.add(lens);

    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(0.45, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: ledColor,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    // Base (reflector)
    const baseGeometry = new THREE.CylinderGeometry(0.25, 0.35, 0.3, 32);
    const baseMaterial = createMetalMaterial(0xDCDCDC, 0.2, 0.9);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.25;
    base.castShadow = true;
    group.add(base);

    // Leads
    const leadGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 16);
    const leadMaterial = createMetalMaterial(0xB0B0B0, 0.4, 0.7);
    const anodeLead = new THREE.Mesh(leadGeometry, leadMaterial);
    anodeLead.position.set(-0.12, -0.8, 0);
    anodeLead.castShadow = true;
    group.add(anodeLead);

    const cathodeLead = new THREE.Mesh(leadGeometry, leadMaterial);
    cathodeLead.position.set(0.12, -0.95, 0);
    cathodeLead.scale.y = 0.8;
    cathodeLead.castShadow = true;
    group.add(cathodeLead);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('led');
    showValuePanel('led');
    resetView();
    hideLoading();
}

// BJT
async function showBJT() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body (TO-92, flat face)
    const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.4, 32, 1, false, 0, Math.PI);
    const bodyMaterial = createPlasticMaterial(0x000000, 0.4);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.y = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // Dome top
    const domeGeometry = new THREE.SphereGeometry(0.25, 32, 32, 0, Math.PI);
    const domeMaterial = createPlasticMaterial(0x000000, 0.4);
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.y = 0.2;
    dome.rotation.y = Math.PI / 2;
    dome.castShadow = true;
    group.add(dome);

    // Leads
    const leadGeometry = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 16);
    const leadMaterial = createMetalMaterial(0xB0B0B0, 0.4, 0.7);
    const emitterLead = new THREE.Mesh(leadGeometry, leadMaterial);
    emitterLead.position.set(-0.15, -0.8, 0);
    emitterLead.castShadow = true;
    group.add(emitterLead);

    const baseLead = emitterLead.clone();
    baseLead.position.set(0, -0.8, 0);
    group.add(baseLead);

    const collectorLead = emitterLead.clone();
    collectorLead.position.set(0.15, -0.8, 0);
    group.add(collectorLead);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('bjt');
    showValuePanel('bjt');
    resetView();
    hideLoading();
}

// FET
async function showFET() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body (TO-220)
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.1);
    const bodyMaterial = createPlasticMaterial(0x000000, 0.4);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // Metal tab
    const tabGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.05);
    const tabMaterial = createMetalMaterial(0xC0C0C0, 0.2, 0.9);
    const tab = new THREE.Mesh(tabGeometry, tabMaterial);
    tab.position.y = 0.55;
    tab.castShadow = true;
    group.add(tab);

    // Hole in tab
    const holeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16);
    const holeMaterial = createMetalMaterial(0xA0A0A0, 0.3, 0.8);
    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.position.set(0, 0.55, 0);
    hole.rotation.x = Math.PI / 2;
    group.add(hole);

    // Leads
    const leadGeometry = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 16);
    const leadMaterial = createMetalMaterial(0xB0B0B0, 0.4, 0.7);
    const drainLead = new THREE.Mesh(leadGeometry, leadMaterial);
    drainLead.position.set(-0.15, -0.8, 0);
    drainLead.castShadow = true;
    group.add(drainLead);

    const gateLead = drainLead.clone();
    gateLead.position.set(0, -0.8, 0);
    group.add(gateLead);

    const sourceLead = drainLead.clone();
    sourceLead.position.set(0.15, -0.8, 0);
    group.add(sourceLead);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('fet');
    showValuePanel('fet');
    resetView();
    hideLoading();
}

// MOSFET
async function showMOSFET() {
    await showFET();
    showInfo('mosfet');
    showValuePanel('mosfet');
}

// JFET
async function showJFET() {
    await showBJT();
    showInfo('jfet');
    showValuePanel('jfet');
}

// IGBT
async function showIGBT() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body (TO-247)
    const bodyGeometry = new THREE.BoxGeometry(0.6, 1.0, 0.15);
    const bodyMaterial = createPlasticMaterial(0x000000, 0.4);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // Metal tab
    const tabGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.05);
    const tabMaterial = createMetalMaterial(0xC0C0C0, 0.2, 0.9);
    const tab = new THREE.Mesh(tabGeometry, tabMaterial);
    tab.position.y = 0.7;
    tab.castShadow = true;
    group.add(tab);

    // Hole in tab
    const holeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16);
    const holeMaterial = createMetalMaterial(0xA0A0A0, 0.3, 0.8);
    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.position.set(0, 0.7, 0);
    hole.rotation.x = Math.PI / 2;
    group.add(hole);

    // Leads
    const leadGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 16);
    const leadMaterial = createMetalMaterial(0xB0B0B0, 0.4, 0.7);
    const collectorLead = new THREE.Mesh(leadGeometry, leadMaterial);
    collectorLead.position.set(-0.2, -0.9, 0);
    collectorLead.castShadow = true;
    group.add(collectorLead);

    const gateLead = collectorLead.clone();
    gateLead.position.set(0, -0.9, 0);
    group.add(gateLead);

    const emitterLead = collectorLead.clone();
    emitterLead.position.set(0.2, -0.9, 0);
    group.add(emitterLead);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('igbt');
    showValuePanel('igbt');
    resetView();
    hideLoading();
}

// UJT
async function showUJT() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body (TO-18 can)
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 32);
    const bodyMaterial = createMetalMaterial(0xA9A9A9, 0.3, 0.8);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // Leads
    const leadGeometry = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 16);
    const leadMaterial = createMetalMaterial(0xB0B0B0, 0.4, 0.7);
    const emitterLead = new THREE.Mesh(leadGeometry, leadMaterial);
    emitterLead.position.set(-0.15, -0.8, 0);
    emitterLead.castShadow = true;
    group.add(emitterLead);

    const base1Lead = emitterLead.clone();
    base1Lead.position.set(0.15, -0.8, 0);
    group.add(base1Lead);

    const base2Lead = emitterLead.clone();
    base2Lead.position.set(0, -0.8, 0);
    group.add(base2Lead);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('ujt');
    showValuePanel('ujt');
    resetView();
    hideLoading();
}

// Phototransistor
async function showPhototransistor() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body (clear TO-92)
    const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.4, 32, 1, false, 0, Math.PI);
    const bodyMaterial = createGlassMaterial(0xFFFFFF, 0.9);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.y = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // Dome top
    const domeGeometry = new THREE.SphereGeometry(0.25, 32, 32, 0, Math.PI);
    const domeMaterial = createGlassMaterial(0xFFFFFF, 0.9);
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.y = 0.2;
    dome.rotation.y = Math.PI / 2;
    dome.castShadow = true;
    group.add(dome);

    // Leads
    const leadGeometry = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 16);
    const leadMaterial = createMetalMaterial(0xB0B0B0, 0.4, 0.7);
    const collectorLead = new THREE.Mesh(leadGeometry, leadMaterial);
    collectorLead.position.set(-0.1, -0.8, 0);
    collectorLead.castShadow = true;
    group.add(collectorLead);

    const emitterLead = collectorLead.clone();
    emitterLead.position.set(0.1, -0.8, 0);
    group.add(emitterLead);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('phototransistor');
    showValuePanel('phototransistor');
    resetView();
    hideLoading();
}

// DC Source
async function showDCSource() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body (bench supply box)
    const bodyGeometry = new THREE.BoxGeometry(1.5, 0.8, 1.0);
    const bodyMaterial = createMetalMaterial(0x4A4A4A, 0.3, 0.7);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // Display (mock)
    const displayGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.01);
    const displayMaterial = createGlassMaterial(0x000000, 0.8);
    const display = new THREE.Mesh(displayGeometry, displayMaterial);
    display.position.set(0, 0.2, 0.51);
    display.castShadow = true;
    group.add(display);

    // Terminals
    const terminalGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 16);
    const posTerminalMaterial = createPlasticMaterial(0xFF0000, 0.3);
    const posTerminal = new THREE.Mesh(terminalGeometry, posTerminalMaterial);
    posTerminal.position.set(-0.4, 0.5, 0);
    posTerminal.castShadow = true;
    group.add(posTerminal);

    const negTerminalMaterial = createPlasticMaterial(0x000000, 0.3);
    const negTerminal = new THREE.Mesh(terminalGeometry, negTerminalMaterial);
    negTerminal.position.set(0.4, 0.5, 0);
    negTerminal.castShadow = true;
    group.add(negTerminal);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('dcsource');
    showValuePanel('dcsource');
    resetView();
    hideLoading();
}

// AC Source
async function showACSource() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body (transformer box)
    const bodyGeometry = new THREE.BoxGeometry(1.2, 0.6, 0.8);
    const bodyMaterial = createMetalMaterial(0x696969, 0.4, 0.7);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // Terminals
    const terminalGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 16);
    const terminalMaterial = createMetalMaterial(0xC0C0C0, 0.2, 0.9);
    const terminal1 = new THREE.Mesh(terminalGeometry, terminalMaterial);
    terminal1.position.set(-0.3, 0.4, 0);
    terminal1.castShadow = true;
    group.add(terminal1);

    const terminal2 = terminal1.clone();
    terminal2.position.set(0.3, 0.4, 0);
    group.add(terminal2);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('acsource');
    showValuePanel('acsource');
    resetView();
    hideLoading();
}

// Battery (9V)
async function showBattery() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.9, 0.3);
    const bodyMaterial = createMetalMaterial(0xA9A9A9, 0.3, 0.8);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // Terminals
    const posTerminalGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.15, 16);
    const posTerminalMaterial = createMetalMaterial(0xFFD700, 0.2, 0.9);
    const posTerminal = new THREE.Mesh(posTerminalGeometry, posTerminalMaterial);
    posTerminal.position.set(-0.1, 0.5, 0);
    posTerminal.castShadow = true;
    group.add(posTerminal);

    const negTerminalGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.15, 16);
    const negTerminalMaterial = createMetalMaterial(0xC0C0C0, 0.2, 0.9);
    const negTerminal = new THREE.Mesh(negTerminalGeometry, negTerminalMaterial);
    negTerminal.position.set(0.1, 0.5, 0);
    negTerminal.castShadow = true;
    group.add(negTerminal);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('battery');
    showValuePanel('battery');
    resetView();
    hideLoading();
}

// Battery Pack
async function showBatteryPack() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Holder
    const holderGeometry = new THREE.BoxGeometry(1.2, 0.6, 0.4);
    const holderMaterial = createPlasticMaterial(0x000000, 0.4);
    const holder = new THREE.Mesh(holderGeometry, holderMaterial);
    holder.castShadow = true;
    group.add(holder);

    // Batteries (4xAA)
    const batteryGeometry = new THREE.CylinderGeometry(0.14, 0.14, 0.5, 32);
    const batteryMaterial = createMetalMaterial(0xA9A9A9, 0.3, 0.8);
    const positions = [
        { x: -0.3, z: -0.1 },
        { x: -0.3, z: 0.1 },
        { x: 0.3, z: -0.1 },
        { x: 0.3, z: 0.1 }
    ];

    positions.forEach(pos => {
        const battery = new THREE.Mesh(batteryGeometry, batteryMaterial);
        battery.position.set(pos.x, 0, pos.z);
        battery.rotation.z = Math.PI / 2;
        battery.castShadow = true;
        group.add(battery);
    });

    // Terminals
    const terminalGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16);
    const posTerminalMaterial = createPlasticMaterial(0xFF0000, 0.3);
    const posTerminal = new THREE.Mesh(terminalGeometry, posTerminalMaterial);
    posTerminal.position.set(-0.6, 0.15, 0);
    posTerminal.castShadow = true;
    group.add(posTerminal);

    const negTerminalMaterial = createPlasticMaterial(0x000000, 0.3);
    const negTerminal = new THREE.Mesh(terminalGeometry, negTerminalMaterial);
    negTerminal.position.set(0.6, 0.15, 0);
    negTerminal.castShadow = true;
    group.add(negTerminal);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('batterypack');
    showValuePanel('batterypack');
    resetView();
    hideLoading();
}

// Solar Panel
async function showSolarPanel() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Panel
    const panelGeometry = new THREE.BoxGeometry(1.5, 0.1, 1.0);
    const panelMaterial = createPlasticMaterial(0x1C2526, 0.2);
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.castShadow = true;
    group.add(panel);

    // Cells
    const cellGeometry = new THREE.BoxGeometry(0.3, 0.01, 0.3);
    const cellMaterial = createGlassMaterial(0x4682B4, 0.9);
    for (let x = -0.6; x <= 0.6; x += 0.4) {
        for (let z = -0.3; z <= 0.3; z += 0.4) {
            const cell = new THREE.Mesh(cellGeometry, cellMaterial);
            cell.position.set(x, 0.06, z);
            cell.castShadow = true;
            group.add(cell);
        }
    }

    // Frame
    const frameGeometry = new THREE.BoxGeometry(1.6, 0.05, 1.1);
    const frameMaterial = createMetalMaterial(0xA9A9A9, 0.3, 0.8);
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.y = -0.03;
    frame.castShadow = true;
    group.add(frame);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('solarpanel');
    showValuePanel('solarpanel');
    resetView();
    hideLoading();
}

// DC Motor
async function showDCMotor() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.0, 32);
    const bodyMaterial = createMetalMaterial(0xA9A9A9, 0.3, 0.8);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // Shaft
    const shaftGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16);
    const shaftMaterial = createMetalMaterial(0xC0C0C0, 0.2, 0.9);
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = 0.75;
    shaft.castShadow = true;
    group.add(shaft);

    // Terminals
    const terminalGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 16);
    const terminalMaterial = createMetalMaterial(0xB87333, 0.4, 0.7);
    const terminal1 = new THREE.Mesh(terminalGeometry, terminalMaterial);
    terminal1.position.set(-0.3, -0.4, 0);
    terminal1.castShadow = true;
    group.add(terminal1);

    const terminal2 = terminal1.clone();
    terminal2.position.set(-0.1, -0.4, 0);
    group.add(terminal2);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('dcmotor');
    showValuePanel('dcmotor');
    resetView();
    hideLoading();
}

// Stepper Motor
async function showStepperMotor() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 32);
    const bodyMaterial = createMetalMaterial(0x696969, 0.3, 0.8);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // Shaft
    const shaftGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16);
    const shaftMaterial = createMetalMaterial(0xC0C0C0, 0.2, 0.9);
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.position.y = 0.6;
    shaft.castShadow = true;
    group.add(shaft);

    // Connector
    const connectorGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.2);
    const connectorMaterial = createPlasticMaterial(0x000000, 0.4);
    const connector = new THREE.Mesh(connectorGeometry, connectorMaterial);
    connector.position.set(0.5, 0, 0);
    connector.castShadow = true;
    group.add(connector);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('steppermotor');
    showValuePanel('steppermotor');
    resetView();
    hideLoading();
}

// Servo Motor
async function showServoMotor() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.8);
    const bodyMaterial = createPlasticMaterial(0x000080, 0.4);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // Arm
    const armGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.4);
    const armMaterial = createPlasticMaterial(0xFFFFFF, 0.3);
    const arm = new THREE.Mesh(armGeometry, armMaterial);
    arm.position.set(0, 0.25, 0);
    arm.castShadow = true;
    group.add(arm);

    // Cable
    const cableGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16);
    const cableMaterial = createPlasticMaterial(0x000000, 0.4);
    const cable = new THREE.Mesh(cableGeometry, cableMaterial);
    cable.position.set(0.3, -0.2, 0);
    cable.rotation.z = Math.PI / 2;
    cable.castShadow = true;
    group.add(cable);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('servomotor');
    showValuePanel('servomotor');
    resetView();
    hideLoading();
}

// Breadboard
async function showBreadboard() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.BoxGeometry(2.0, 0.2, 1.2);
    const bodyMaterial = createPlasticMaterial(0xFFFFFF, 0.3);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // Holes
    const holeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.05, 16);
    const holeMaterial = createMetalMaterial(0xC0C0C0, 0.2, 0.9);
    for (let x = -0.9; x <= 0.9; x += 0.1) {
        for (let z = -0.5; z <= 0.5; z += 0.1) {
            const hole = new THREE.Mesh(holeGeometry, holeMaterial);
            hole.position.set(x, 0.11, z);
            hole.rotation.x = Math.PI / 2;
            group.add(hole);
        }
    }

    // Power rails
    const railGeometry = new THREE.BoxGeometry(2.0, 0.02, 0.1);
    const posRailMaterial = createPlasticMaterial(0xFF0000, 0.3);
    const posRail = new THREE.Mesh(railGeometry, posRailMaterial);
    posRail.position.set(0, 0.11, 0.55);
    posRail.castShadow = true;
    group.add(posRail);

    const negRailMaterial = createPlasticMaterial(0x0000FF, 0.3);
    const negRail = new THREE.Mesh(railGeometry, negRailMaterial);
    negRail.position.set(0, 0.11, -0.55);
    negRail.castShadow = true;
    group.add(negRail);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('breadboard');
    showValuePanel('breadboard');
    resetView();
    hideLoading();
}

// Connecting Wire
async function showWire() {
    showLoading();
    clearCurrentComponent();
    const group = new THREE.Group();

    // Wire
    const wireGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.0 + wireStretch, 16);
    const wireMaterial = createPlasticMaterial(0xFF0000, 0.3);
    const wire = new THREE.Mesh(wireGeometry, wireMaterial);
    wire.rotation.z = Math.PI / 2;
    wire.castShadow = true;
    group.add(wire);

    // Metal ends
    const endGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 16);
    const endMaterial = createMetalMaterial(0xC0C0C0, 0.2, 0.9);
    const leftEnd = new THREE.Mesh(endGeometry, endMaterial);
    leftEnd.rotation.z = Math.PI / 2;
    leftEnd.position.x = -(0.5 + wireStretch / 2);
    leftEnd.castShadow = true;
    group.add(leftEnd);

    const rightEnd = leftEnd.clone();
    rightEnd.position.x = 0.5 + wireStretch / 2;
    group.add(rightEnd);

    group.position.y = 0.5;
    scene.add(group);
    currentComponent = group;

    showInfo('wire');
    showValuePanel('wire');
    resetView();
    hideLoading();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (animationEnabled && currentComponent) {
        currentComponent.rotation.y += rotationSpeed;
    }
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    const viewerWidth = window.innerWidth - (window.innerWidth > 768 ? 280 : 0);
    camera.aspect = viewerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewerWidth, window.innerHeight);
});

// Toggle nav panel on mobile
document.getElementById('nav-toggle').addEventListener('click', () => {
    document.getElementById('nav-panel').classList.toggle('active');
});

// Initialize
showComponent('resistor');
animate();