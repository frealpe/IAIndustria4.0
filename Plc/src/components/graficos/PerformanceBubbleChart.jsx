import React, { useEffect, useRef, useState } from 'react';
import { CCard, CCardBody, CCardHeader } from '@coreui/react-pro';
import * as d3 from 'd3';

const PerformanceBubbleChart = ({ data = [] }) => {
    const svgRef = useRef(null);
    const wrapperRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Handle resize
    useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                setDimensions({ width, height });
            }
        });
        if (wrapperRef.current) resizeObserver.observe(wrapperRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Draw Chart
    useEffect(() => {
        if (!data || data.length === 0 || dimensions.width === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous

        const { width, height } = dimensions;
        const margin = { top: 30, right: 30, bottom: 40, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Process Data: Use raw data for Scatter Plot or grouped by short intervals if too many
        // X: Timestamp
        // Y: Voltage
        // Color: Anomaly (Red), Normal (Green/Blue)
        // Radius: Fixed or slightly larger for anomalies

        const formattedData = data.map(d => ({
            ...d,
            date: d.timestamp instanceof Date ? d.timestamp : new Date(d.timestamp),
            val: d.voltage !== undefined ? d.voltage : d.voltaje || 0,
            isAnomaly: d.isAnomaly || d.resultado?.isAnomaly || false,
            device: d.deviceUid || d.deviceId || 'Unknown'
        })).sort((a, b) => a.date - b.date);

        // Scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(formattedData, d => d.date))
            .range([0, innerWidth]);

        // Y-Axis: Handle outliers (User reported max 5000 is too big)
        // Calculate logical max based on data distribution (e.g., P95 or Mean + 3*StdDev)
        const values = formattedData.map(d => d.val).sort((a, b) => a - b);
        const q3 = d3.quantile(values, 0.75);
        const iqr = q3 - d3.quantile(values, 0.25);
        const upperLimit = q3 + 1.5 * iqr;

        const yScale = d3.scaleLinear()
            .domain([0, 5000]) // Fixed range as requested by user
            .range([innerHeight, 0]);

        const colorScale = (isAnomaly) => isAnomaly ? '#dc3545' : '#0d6efd'; // Red vs Blue

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Axes
        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).ticks(5))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-15)");

        g.append("g")
            .call(d3.axisLeft(yScale))
            .append("text")
            .attr("x", -10)
            .attr("y", -10)
            .attr("fill", "#666")
            .attr("text-anchor", "end")
            .text("Voltaje (V)");

        // Grid lines
        g.append("g")
            .attr("class", "grid")
            .attr("opacity", 0.1)
            .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(""));

        g.append("g")
            .attr("class", "grid")
            .attr("opacity", 0.1)
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(""));

        // Tooltip
        const tooltip = d3.select(wrapperRef.current)
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "white")
            .style("border", "1px solid #ccc")
            .style("border-radius", "4px")
            .style("padding", "8px")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("z-index", 1000)
            .style("font-size", "12px")
            .style("box-shadow", "2px 2px 6px rgba(0,0,0,0.1)");

        // Draw Circles (Scatter)
        g.selectAll("circle")
            .data(formattedData)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.date))
            .attr("cy", d => yScale(d.val))
            .attr("r", d => d.isAnomaly ? 6 : 3) // Anomalies bigger
            .style("fill", d => colorScale(d.isAnomaly))
            .style("opacity", d => d.isAnomaly ? 0.9 : 0.5)
            .style("stroke", d => d.isAnomaly ? "#fff" : "none")
            .style("stroke-width", 1.5)
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .transition().duration(100)
                    .attr("r", d.isAnomaly ? 8 : 6)
                    .style("opacity", 1);

                tooltip.style("opacity", 1);
            })
            .on("mousemove", function (event, d) {
                tooltip
                    .html(`
                        <strong>${d.device}</strong><br/>
                        Hora: ${d3.timeFormat("%H:%M:%S")(d.date)}<br/>
                        Voltaje: <strong>${d.val.toFixed(2)} V</strong><br/>
                        Estado: ${d.isAnomaly ? '<span style="color:red">Anomalía</span>' : 'Normal'}
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseleave", function (event, d) {
                d3.select(this)
                    .transition().duration(100)
                    .attr("r", d.isAnomaly ? 6 : 3)
                    .style("opacity", d.isAnomaly ? 0.9 : 0.5);

                tooltip.style("opacity", 0);
            });

    }, [data, dimensions]);

    return (
        <CCard className="h-100 shadow-sm border-0">
            <CCardHeader className="bg-white border-bottom-0 py-3 d-flex justify-content-between">
                <div>
                    <span className="text-primary fw-bold" style={{ fontSize: '0.9rem' }}>
                        🕰️ Dispersión Temporal (Anomalías vs Normal)
                    </span>
                    <div className="small text-muted">
                        Visualización detallada de cada muestra en el tiempo
                    </div>
                </div>
                <div className="small d-flex gap-2 align-items-center">
                    <span className="d-flex align-items-center"><span style={{ width: 8, height: 8, backgroundColor: '#0d6efd', borderRadius: '50%', marginRight: 4 }}></span> Normal</span>
                    <span className="d-flex align-items-center"><span style={{ width: 8, height: 8, backgroundColor: '#dc3545', borderRadius: '50%', marginRight: 4 }}></span> Anomalía</span>
                </div>
            </CCardHeader>
            <CCardBody className="p-0 position-relative" style={{ overflow: 'hidden' }}>
                <div ref={wrapperRef} style={{ width: '100%', height: '100%' }}>
                    <svg ref={svgRef} width="100%" height="100%"></svg>
                </div>
            </CCardBody>
        </CCard>
    );
};

export default PerformanceBubbleChart;
