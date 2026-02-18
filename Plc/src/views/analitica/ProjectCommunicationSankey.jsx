import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { CCard, CCardBody, CCardHeader, CSpinner } from '@coreui/react-pro';

const ProjectCommunicationSankey = () => {
    const d3Container = useRef(null);
    const [containerWidth, setContainerWidth] = useState(1000);
    const [graphData, setGraphData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Resize observer to make it responsive
        if (d3Container.current) {
            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    setContainerWidth(entry.contentRect.width);
                }
            });
            resizeObserver.observe(d3Container.current);
            return () => resizeObserver.disconnect();
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
                const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

                // Fetch Devices
                const response = await fetch(`${cleanBaseUrl}/data/devices/all`);
                const devices = await response.json();

                buildGraph(devices);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching devices:", error);
                // Fallback / Demo data if fetch fails
                buildGraph([
                    { device_uid: "Demo-ESP32-01", status: "active" },
                    { device_uid: "Demo-ESP32-02", status: "inactive" }
                ]);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const buildGraph = (devices) => {
        // 1. Nodes
        // We have dynamic Device nodes + Fixed System nodes
        // System Nodes: Mosquitto, Backend, DB, Frontend

        let nodes = [];
        let links = [];

        // Helper to get node index
        const getNodeIndex = (name) => nodes.findIndex(n => n.name === name);
        const addNode = (name, category, color) => {
            nodes.push({ name, category, color });
            return nodes.length - 1;
        };

        // Fixed Nodes Indices (we'll look them up to be safe)
        const mossIdx = addNode("Mosquitto Broker", "Messaging", "#f9b115");
        const backIdx = addNode("Node.js Backend", "Core", "#e55353");
        const dbIdx = addNode("PostgreSQL DB", "Storage", "#3399ff");
        const frontIdx = addNode("React Frontend", "View", "#6f42c1");

        // Device Nodes
        devices.forEach((d, i) => {
            const deviceName = d.device_uid || `Device ${i + 1}`;
            const color = d.status === 'active' ? "#2eb85c" : "#999";
            const devIdx = addNode(deviceName, "Field Device", color);

            // Link: Device -> Mosquitto
            links.push({
                source: devIdx,
                target: mossIdx,
                value: 20, // base weight
                type: "Telemetry",
                color: color
            });
        });

        // System Links (Fixed Flows)
        // Mosquitto -> Backend
        links.push({ source: mossIdx, target: backIdx, value: devices.length * 20, type: "Subscriptions", color: "#f9b115" });

        // Backend -> DB
        links.push({ source: backIdx, target: dbIdx, value: devices.length * 15, type: "Inserts", color: "#e55353" });

        // Backend -> Frontend
        links.push({ source: backIdx, target: frontIdx, value: devices.length * 10, type: "Real-time", color: "#e55353" });

        setGraphData({ nodes, links });
    };

    useEffect(() => {
        if (d3Container.current && containerWidth > 0 && graphData) {
            renderSankey();
        }
    }, [containerWidth, graphData]);

    const renderSankey = () => {
        if (!graphData) return;

        d3.select(d3Container.current).selectAll("*").remove();

        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const width = containerWidth - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const svg = d3.select(d3Container.current)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Generator
        const sankey = d3Sankey()
            .nodeWidth(20)
            .nodePadding(20)
            .extent([[1, 1], [width - 1, height - 6]]);

        // Deep copy data because d3-sankey mutates it
        const graph = sankey({
            nodes: graphData.nodes.map(d => ({ ...d })),
            links: graphData.links.map(d => ({ ...d }))
        });

        // --- Gradients for Links ---
        const defs = svg.append("defs");
        graph.links.forEach((d, i) => {
            const gradientID = `gradient-${i}`;
            const gradient = defs.append("linearGradient")
                .attr("id", gradientID)
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", d.source.x1)
                .attr("x2", d.target.x0);

            gradient.append("stop").attr("offset", "0%").attr("stop-color", d.source.color);
            gradient.append("stop").attr("offset", "100%").attr("stop-color", d.target.color);
        });

        // --- DRAW LINKS ---
        svg.append("g")
            .attr("fill", "none")
            .selectAll("path")
            .data(graph.links)
            .join("path")
            .attr("d", sankeyLinkHorizontal())
            .attr("stroke", (d, i) => `url(#gradient-${i})`)
            .attr("stroke-width", d => Math.max(1, d.width))
            .attr("stroke-opacity", 0.4)
            .style("transition", "stroke-opacity 0.3s")
            .on("mouseover", function () {
                d3.select(this).attr("stroke-opacity", 0.8);
            })
            .on("mouseout", function () {
                d3.select(this).attr("stroke-opacity", 0.4);
            })
            .append("title")
            .text(d => `${d.source.name} → ${d.target.name}\n${d.type}`);

        // --- DRAW NODES ---
        const nodes = svg.append("g")
            .selectAll("g")
            .data(graph.nodes)
            .join("g");

        // Node Rects
        nodes.append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d => d.color)
            .attr("stroke", "#000")
            .attr("rx", 3)
            .append("title")
            .text(d => `${d.name}\n${d.category}`);

        // Node Labels
        nodes.append("text")
            .attr("x", d => d.x0 < width / 2 ? d.x1 + 10 : d.x0 - 10)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
            .text(d => d.name)
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .style("fill", "#ddd")
            .style("text-shadow", "1px 1px 2px #000")
            .style("pointer-events", "none");
    };

    return (
        <CCard className="mb-4">
            <CCardHeader>Flujo de Dispositivos Conectados (Tiempo Real)</CCardHeader>
            <CCardBody style={{ backgroundColor: '#1e1e1e', borderRadius: '0 0 4px 4px' }}>
                {loading ? (
                    <div className="text-center text-white"><CSpinner /> Cargando dispositivos...</div>
                ) : (
                    <div ref={d3Container} style={{ width: '100%', height: '500px' }} />
                )}
            </CCardBody>
        </CCard>
    );
};

export default ProjectCommunicationSankey;
