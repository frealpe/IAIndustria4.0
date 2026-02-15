import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const BeeswarmChart = ({ data, width = 400, height = 200 }) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || data.length === 0 || !svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // Margins
        const margin = { top: 20, right: 30, bottom: 30, left: 40 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // 1. Scales
        // Determine domain based on max absolute value
        // Use 'value' prop if available, else fallback to 'voltage' (migration)
        const getValue = d => (d.value !== undefined ? d.value : d.voltage);

        const maxVal = d3.max(data, d => Math.abs(getValue(d))) || 0;

        // Dynamic limit: 
        // If big > 5 -> 4500 (ADC)
        // If small (e.g. 0.02) -> maxVal * 1.5 (with min 0.1 to avoid 0 range)
        let limit = 0.5;
        if (maxVal > 5) limit = 4500;
        else if (maxVal > 0) limit = Math.max(0.1, maxVal * 1.5);

        // Y Axis: Value (Loss) - Inverted (0 at bottom)
        const y = d3.scaleLinear()
            .domain([0, limit])
            .range([innerHeight, 0]);

        // X Axis: Quantity/Density Distribution (Centered)
        const centerX = innerWidth / 2;

        // 2. Simulation (Force)
        const nodes = data.map((d, i) => ({
            ...d,
            id: i,
            x: centerX, // Start at center X
            y: y(getValue(d)) // Position by Value Y
        }));

        const simulation = d3.forceSimulation(nodes)
            .force("y", d3.forceY(d => y(getValue(d))).strength(1)) // Anchor Y position
            .force("x", d3.forceX(centerX).strength(0.1)) // Cluster horizontally
            .force("collide", d3.forceCollide(4))
            .stop();

        // Run simulation statically for performance
        for (let i = 0; i < 120; ++i) simulation.tick();

        // 3. Render
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Horizontal Zero Line (Baseline)
        g.append("line")
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", y(0))
            .attr("y2", y(0))
            .attr("stroke", "#adb5bd")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4");

        // Y Axis (Left)
        g.append("g")
            .call(d3.axisLeft(y).ticks(5))
            .call(g => g.select(".domain").remove());

        // Circles
        g.selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", 3.5)
            .attr("fill", d => (d.isAnomaly && d.isAnomaly !== 'false') ? "#dc3545" : "#0d6efd")
            .attr("stroke", "white")
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.8)
            .append("title")
            .text(d => `Valor: ${getValue(d).toFixed(5)}`);

        // X Axis Label (Quantity implied)
        g.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 25)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "#666")
            .text("Distribución (Ancho = Cantidad)");

        // Y Axis Label
        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -30)
            .attr("x", -innerHeight / 2)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "#666")
            .text("Loss (Anomalía)");

    }, [data, width, height]);

    return (
        <svg ref={svgRef} width={width} height={height} style={{ maxWidth: '100%', height: 'auto' }} />
    );
};

export default BeeswarmChart;
