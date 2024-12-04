// Configuración del gráfico único
const width = 800;
const height = 500;
const margin = { top: 20, right: 30, bottom: 40, left: 50 };

const colorScale = d3.scaleOrdinal(d3.schemeCategory10); // Escala de colores para diferentes minerales

// Crear SVG único
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Escalas compartidas
let x = d3.scaleLinear().domain([0, 2.5]).range([0, width]); // Longitud de onda  en el eje X
let y = d3.scaleLinear().domain([0, 1.0]).range([height, 0]); // Reflectanciaen el eje Y (fijo)

// Ejes compartidos
const xAxis = d3.axisBottom(x).ticks(10);
const yAxis = d3.axisLeft(y).ticks(10);

// Dibujar ejes
svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .attr("class", "x-axis")
    .call(xAxis)
    .append("text")
    .attr("fill", "black")
    .attr("x", width / 2)
    .attr("y", 35)
    .text("Longitud de onda (µm)");

svg.append("g")
    .attr("class", "y-axis")
    .call(yAxis)
    .append("text")
    .attr("fill", "black")
    .attr("x", -height / 2)
    .attr("y", -40)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Reflectancia (%)");

// Crear tooltip compartido
const tooltip = d3.select("body").append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid black")
    .style("padding", "5px")
    .style("display", "none")
    .style("pointer-events", "none");

// Procesar archivos seleccionados para representar firmas espectrales
document.getElementById("processFiles").addEventListener("click", () => {
    const files = document.getElementById("fileInput").files;
    const mineralName = document.getElementById("mineralNameInput").value.trim() || `Mineral ${Math.floor(Math.random() * 100)}`;

    if (files.length !== 2) {
        alert("Por favor, seleccione exactamente dos archivos: uno de longitudes de onda y otro de reflectancia.");
        return;
    }

    const promises = Array.from(files).map(file => readFile(file));
    Promise.all(promises)
        .then(fileContents => {
            const { wavelengths, reflectances } = processFiles(fileContents);

            // Ajustar escala dinámica solo para el eje X
            updateScales(reflectances);

            // Dibujar los datos espectrales con el nombre ingresado
            drawSpectralData(wavelengths, reflectances, mineralName);
        })
        .catch(error => alert(`Error procesando archivos: ${error.message}`));
});

// Botón para limpiar la gráfica
document.getElementById("clearChart").addEventListener("click", () => {
    svg.selectAll(".spectral").remove(); // Limpiar todas las líneas
    alert("Se ha limpiado la gráfica.");
});

// Leer contenido de un archivo
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = error => reject(error);
        reader.readAsText(file);
    });
}

// Procesar archivos combinados
function processFiles(fileContents) {
    const wavelengths = fileContents[0]
        .split("\n")
        .map(line => parseFloat(line.trim()))
        .filter(val => !isNaN(val));

    const reflectances = fileContents[1]
        .split("\n")
        .map(line => parseFloat(line.trim()))
        .filter(val => !isNaN(val) && val !== -1.23e34);

    if (wavelengths.length !== reflectances.length) {
        throw new Error(
            `Los datos no coinciden: ${wavelengths.length} longitudes de onda vs ${reflectances.length} reflectancias.`
        );
    }

    return { wavelengths, reflectances };
}

// Actualizar las escalas dinámicamente (solo eje X)
function updateScales(reflectances) {
    const newXDomain = [0, d3.max(reflectances)]; // Reflectancia en eje X (dinámico)

    x.domain(newXDomain); // Mantiene el dominio dinámico para el eje X

    svg.select(".x-axis").call(d3.axisBottom(x));
    // El eje Y no se actualiza porque tiene un rango fijo
}


// Dibujar datos espectrales
function drawSpectralData(wavelengths, reflectances, mineralName) {
    const spectralData = wavelengths.map((wavelength, index) => ({
        wavelength,
        reflectance: reflectances[index]
    }));

    svg.append("path")
        .datum(spectralData)
        .attr("class", "spectral")
        .attr("fill", "none")
        .attr("stroke", colorScale(mineralName)) // Color único para cada mineral
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => x(d.reflectance))
            .y(d => y(d.wavelength))
        );

    svg.append("text")
        .attr("class", "spectral")
        .attr("x", width - 150)
        .attr("y", 20 + svg.selectAll(".spectral").size() * 20) // Espaciado dinámico para múltiples etiquetas
        .attr("fill", colorScale(mineralName))
        .attr("font-size", "14px")
        .text(mineralName);
}

function loadBandData(dataset) {
    d3.json("data.json").then(data => {
        const bands = data[dataset];
        drawBands(bands);
    }).catch(error => console.error("Error al cargar los datos de bandas:", error));
}


function drawBands(bands) {
    // Elimina las bandas anteriores
    svg.selectAll(".band").remove();

    // Dibujar cada banda como un rectángulo
    svg.selectAll(".band")
        .data(bands)
        .enter()
        .append("rect")
        .attr("class", "band")
        .attr("x", d => x(d.wavelength_start))
        .attr("width", d => x(d.wavelength_end) - x(d.wavelength_start))
        .attr("y", 0)
        .attr("height", height)
        .attr("fill", "blue")
        .attr("opacity", 0.2)
        .on("mouseover", (event, d) => {
            // Mostrar tooltip
            tooltip.style("display", "block")
                .html(`<strong>${d.band}</strong><br>${d.wavelength_start} - ${d.wavelength_end} µm`);
        })
        .on("mousemove", (event) => {
            // Posicionar el tooltip cerca del cursor
            tooltip.style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", () => {
            // Ocultar tooltip
            tooltip.style("display", "none");
        });
}


document.getElementById("dataset").addEventListener("change", event => {
    const selectedDataset = event.target.value;
    loadBandData(selectedDataset);
});

// Cargar las bandas iniciales al cargar la página
loadBandData("landsat9");
