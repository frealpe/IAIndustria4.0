import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import ControlService from '../../service/control/control.service';

const SystemArchitecture = ({ width = 800, height = 400, onDeviceSelect, selectedDeviceId }) => {
    const svgRef = useRef();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDevices = async () => {
            const result = await ControlService.getAllDevices();
            if (result.ok) {
                // Filter active devices if needed, but here we show all registered ones
                setDevices(result.data);
            }
            setLoading(false);
        };
        fetchDevices();
    }, []);

    useEffect(() => {
        if (!svgRef.current || loading) return;

        const container = d3.select(svgRef.current);
        container.selectAll("*").remove();

        const svg = container
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif; user-select: none;");

        // Define base nodes
        const nodes = [
            { id: "Server", group: "center", x: width / 2, y: height / 2, label: "Servidor Central" },
            { id: "Frontend", group: "output", x: (3 * width) / 4, y: height / 2, label: "Frontend App" },
            { id: "Monitoreo", group: "feature", x: (7 * width) / 8, y: height / 4, label: "Monitoreo" },
            { id: "Historial", group: "feature", x: (7 * width) / 8, y: (1.5 * height) / 4, label: "Historial" },
            { id: "Dispositivos", group: "feature", x: (7 * width) / 8, y: (2.5 * height) / 4, label: "Dispositivos" },
            { id: "Training", group: "feature", x: (7 * width) / 8, y: (3.5 * height) / 4, label: "AI Training" },
        ];

        const links = [
            { source: "Server", target: "Frontend", protocol: "HTTP/WS" },
            { source: "Frontend", target: "Monitoreo", protocol: "" },
            { source: "Frontend", target: "Historial", protocol: "" },
            { source: "Frontend", target: "Dispositivos", protocol: "" },
            { source: "Frontend", target: "Training", protocol: "" },
        ];

        // Add dynamic device nodes
        const deviceNodes = devices.map((dev, i) => {
            const spacing = devices.length > 1 ? height / (devices.length + 1) : height / 2;
            const yPos = devices.length > 1 ? (i + 1) * spacing : height / 2;
            return {
                id: dev.device_uid,
                group: "input",
                x: width / 4,
                y: yPos,
                label: dev.name || dev.device_uid,
                status: dev.is_active,
                originalData: dev
            };
        });

        nodes.push(...deviceNodes);

        // Add links for devices
        deviceNodes.forEach(devNode => {
            links.push({
                source: devNode.id,
                target: "Server",
                protocol: "MQTT"
            });
        });

        // Arrow marker
        svg.append("defs").append("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 20)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("fill", "#999")
            .attr("d", "M0,-5L10,0L0,5");

        const link = svg.append("g")
            .attr("fill", "none")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", 2)
            .selectAll("path")
            .data(links)
            .join("path")
            .attr("id", d => `link-${d.source.id || d.source}-${d.target.id || d.target}`)
            .attr("d", d => {
                const source = nodes.find(n => n.id === (d.source.id || d.source));
                const target = nodes.find(n => n.id === (d.target.id || d.target));
                return `M${source.x},${source.y} L${target.x},${target.y}`;
            })
            .attr("marker-end", "url(#arrow)");

        const linkLabel = svg.append("g")
            .selectAll("text")
            .data(links.filter(l => l.protocol))
            .join("text")
            .attr("dy", -5)
            .append("textPath")
            .attr("xlink:href", d => `#link-${d.source.id || d.source}-${d.target.id || d.target}`)
            .attr("startOffset", "50%")
            .attr("text-anchor", "middle")
            .attr("fill", "#666")
            .style("font-size", "10px")
            .text(d => d.protocol);

        const node = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .attr("cursor", d => d.group === "input" ? "pointer" : "default")
            .on("click", (event, d) => {
                if (d.group === "input" && onDeviceSelect) {
                    // console.log("Selecting device:", d.id);
                    // Prevent duplicate key warning by destructuring id out first
                    const { id: _, ...restData } = d.originalData || {};
                    onDeviceSelect({
                        name: d.label,
                        ...restData,
                        id: d.id // Ensure id is device_uid
                    });
                }
            });

        node.append("circle")
            .attr("r", d => (d.group === "input" && d.id === selectedDeviceId) ? 12 : 8)
            .attr("fill", d => {
                if (d.group === "center") return "#dc3545";
                if (d.group === "input") return d.status ? "#0d6efd" : "#6c757d";
                if (d.group === "output") return "#198754";
                return "#ffc107";
            })
            .attr("stroke", d => (d.group === "input" && d.id === selectedDeviceId) ? "#ffc107" : "#fff")
            .attr("stroke-width", d => (d.group === "input" && d.id === selectedDeviceId) ? 4 : 2);

        node.append("text")
            .attr("dy", "0.31em")
            .attr("x", d => d.group === "input" ? -15 : 15)
            .attr("text-anchor", d => d.group === "input" ? "end" : "start")
            .text(d => d.label)
            .attr("fill", "#333")
            .style("font-weight", d => d.id === selectedDeviceId ? "bold" : "normal")
            .clone(true).lower()
            .attr("stroke", "#fff")
            .attr("stroke-width", 3);

        // Animation: Pulsing for server
        function pulse() {
            svg.selectAll("circle")
                .filter(d => d.group === "center")
                .transition()
                .duration(1000)
                .attr("r", 12)
                .transition()
                .duration(1000)
                .attr("r", 8)
                .on("end", pulse);
        }
        pulse();

    }, [width, height, devices, loading, selectedDeviceId, onDeviceSelect]);

    if (loading) return (
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8f9fa', borderRadius: '8px' }}>
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default SystemArchitecture;
