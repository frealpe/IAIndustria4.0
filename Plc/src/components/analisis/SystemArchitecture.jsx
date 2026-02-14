import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import ControlService from '../../service/control/control.service';
import archConfig from './architecture_config.json';

const SystemArchitecture = ({ width = 800, height = 500, onDeviceSelect, selectedDeviceId }) => {
    const svgRef = useRef();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const result = await ControlService.getAllDevices();
            if (result.ok) {
                setDevices(result.data);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!svgRef.current || loading) return;

        const container = d3.select(svgRef.current);
        container.selectAll("*").remove();

        // 1. Prepare Data (Nodes & Links)
        // Flatten config nodes
        const nodes = archConfig.nodes.map(n => ({ ...n, type: 'static' }));
        const links = archConfig.links.map(l => ({ ...l }));

        // Add dynamic devices to nodes
        const deviceLayerId = archConfig.device_layer;
        const deviceLayer = archConfig.layers.find(l => l.id === deviceLayerId);

        const deviceNodes = devices.map(d => ({
            id: d.device_uid,
            label: d.name || d.device_uid,
            layer: deviceLayerId,
            type: 'device',
            color: d.is_active ? "#28a745" : "#6c757d",
            originalData: d,
            isDevice: true
        }));

        // Merge nodes
        const allNodes = [...nodes, ...deviceNodes];

        // Add links from devices to Broker
        const brokerNode = nodes.find(n => n.id === "Broker");
        if (brokerNode) {
            deviceNodes.forEach(dn => {
                links.push({
                    source: dn.id,
                    target: brokerNode.id,
                    protocol: "MQTTS"
                });
            });
        }

        // Color Scale for layers
        const colorScale = d3.scaleOrdinal()
            .domain(archConfig.layers.map(l => l.id))
            .range(archConfig.layers.map(l => l.color));

        // 2. Setup SVG
        const svg = container
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif; cursor: move;");

        // Add Zoom Group
        const g = svg.append("g");

        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

        // 3. Force Simulation
        const simulation = d3.forceSimulation(allNodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide(30));

        // 4. Rendering

        // Arrow Marker
        svg.append("defs").selectAll("marker")
            .data(["suit"])
            .join("marker")
            .attr("id", d => d)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 18) // Offset to not overlap node
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("fill", "#999")
            .attr("d", "M0,-5L10,0L0,5");

        // Links
        const link = g.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("path")
            .data(links)
            .join("path")
            .attr("stroke-width", 1.5)
            .attr("marker-end", "url(#suit)")
            .attr("fill", "none");

        // Link Labels (Protocol)
        const linkLabels = g.append("g")
            .selectAll("text")
            .data(links.filter(l => l.protocol))
            .join("text")
            .attr("dy", -3)
            .attr("fill", "#0d6efd") // Blue
            .style("font-weight", "bold")
            .style("font-size", "11px")
            .style("text-shadow", "1px 1px 0 #fff")
            .text(d => d.protocol);


        // Nodes
        const node = g.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll("g")
            .data(allNodes)
            .join("g")
            .style("cursor", d => (d.isDevice || d.layer === 'server') ? "pointer" : "grab")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
            .on("click", (event, d) => {
                if (onDeviceSelect) {
                    if (d.isDevice) {
                        const { id: _, ...restData } = d.originalData || {};
                        onDeviceSelect({
                            name: d.label,
                            ...restData,
                            id: d.id,
                            type: 'device'
                        });
                    } else if (d.layer === 'server') {
                        onDeviceSelect({
                            id: d.id,
                            name: d.label, // "Supervisor (LangGraph)"
                            type: 'agent',
                            layer: d.layer
                        });
                    }
                }
            });

        node.append("circle")
            .attr("r", d => d.type === 'device' ? 8 : 12)
            .attr("fill", d => d.type === 'device' ? d.color : (colorScale(d.layer) || "#555"))
            .attr("stroke", d => d.isDevice && d.id === selectedDeviceId ? "#ffc107" : "#fff")
            .attr("stroke-width", d => d.isDevice && d.id === selectedDeviceId ? 3 : 1.5);

        node.append("text")
            .attr("x", 15)
            .attr("y", "0.31em")
            .text(d => d.label)
            .style("font-size", "14px")
            .style("font-weight", "800")
            .attr("fill", "#700c35ff") // Blue Fill
            .attr("stroke", "white") // White Halo
            .attr("stroke-width", 3) // Halo Width
            .style("paint-order", "stroke fill"); // Ensure stroke is behind fill

        simulation.on("tick", () => {
            // Update Link Positions (Curved)
            link.attr("d", d => {
                return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
            });

            // Update Link Label Positions (Midpoint)
            linkLabels
                .attr("x", d => (d.source.x + d.target.x) / 2)
                .attr("y", d => (d.source.y + d.target.y) / 2);

            // Update Node Positions
            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

    }, [width, height, devices, loading, selectedDeviceId, onDeviceSelect]);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center h-100 w-100">
            <div className="spinner-border text-primary" role="status"></div>
        </div>
    );

    return (
        <div className="w-100 h-100 p-2" style={{ background: '#fff', borderRadius: '12px' }}>
            <svg ref={svgRef} className="w-100 h-100"></svg>
        </div>
    );
};

export default SystemArchitecture;
