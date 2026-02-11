import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CFormSelect } from '@coreui/react-pro';
import projectData from '../../service/projectStructure.json';

const ProjectTidyTree = () => {
    const wrapperRef = useRef();
    const svgRef = useRef();
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [layoutType, setLayoutType] = useState('orthogonal'); // 'orthogonal' | 'radial'

    useEffect(() => {
        if (!wrapperRef.current) return;

        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });

        resizeObserver.observe(wrapperRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

        const { width, height } = dimensions;

        // Clear existing SVG
        const container = d3.select(svgRef.current);
        container.selectAll("*").remove();

        // -------------------------------------------------------------
        // DATA PROCESSING (Common)
        // -------------------------------------------------------------

        // Recursive function to keep only directories (nodes with children)
        const filterDirectories = (node, isRoot = false) => {
            if (!node || !node.children) return null;
            if (node.name.startsWith('.')) return null;

            const newNode = { ...node };

            if (isRoot) {
                const allowedModules = ['Esp32', 'Servidor', 'Plc'];
                newNode.children = node.children
                    .filter(c => allowedModules.includes(c.name))
                    .map(c => filterDirectories(c, false))
                    .filter(n => n !== null);
            } else {
                newNode.children = node.children
                    .filter(c => c.name !== 'Documentacion')
                    .map(c => filterDirectories(c, false))
                    .filter(n => n !== null);
            }
            return newNode;
        };

        const absoluteRoot = projectData;

        // -------------------------------------------------------------
        // INJECT VIRTUAL AGENTS (User Request)
        // -------------------------------------------------------------
        // Find Servidor/services/agentes and inject the 4 specific agents
        const injectAgents = (node) => {
            // We need to traverse down to find 'services' and then 'agentes'
            if (node.name === 'Servidor' && node.children) {
                const servicesNode = node.children.find(c => c.name === 'services');
                if (servicesNode) {
                    // Ensure services keeps its children first
                    if (!servicesNode.children) servicesNode.children = [];

                    // Find or create 'agentes' folder inside services
                    let agentesNode = servicesNode.children.find(c => c.name === 'agentes');

                    if (!agentesNode) {
                        agentesNode = { name: 'agentes', children: [] };
                        servicesNode.children.push(agentesNode);
                    }

                    // Now populate 'agentes' with our virtual agents
                    // Note: We might want to keep existing children (files) if filter allows, 
                    // but here we are forcing these 4 logical agents.
                    // Let's APPEND them or REPLACE? User said "appear in agents".
                    // Let's Append them to any existing children.
                    if (!agentesNode.children) agentesNode.children = [];

                    const logicalAgents = [
                        { name: 'Orchestrator', children: [] },
                        { name: 'SQL Expert', children: [] },
                        { name: 'Data Scientist', children: [] },
                        { name: 'Supervisor', children: [] }
                    ];

                    // Avoid duplicates if re-running
                    logicalAgents.forEach(agent => {
                        if (!agentesNode.children.find(c => c.name === agent.name)) {
                            agentesNode.children.push(agent);
                        }
                    });
                }
            }

            if (node.children) {
                node.children.forEach(injectAgents);
            }
        };

        // We need to clone absoluteRoot first to avoid mutating prop/json directly if it was imported (though imports are usually immutable/cached)
        // Deep clone simple object
        const rootClone = JSON.parse(JSON.stringify(absoluteRoot));

        injectAgents(rootClone);

        const data = filterDirectories(rootClone, true);
        if (!data) return;
        data.name = "SISTEMA INTEGRADO";

        const root = d3.hierarchy(data);

        // -------------------------------------------------------------
        // VISUALIZATION LOGIC
        // -------------------------------------------------------------

        const svg = container
            .attr("width", width)
            .attr("height", height)
            .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif; user-select: none;");

        const g = svg.append("g");
        const zoom = d3.zoom()
            .scaleExtent([0.1, 8])
            .on("zoom", (event) => g.attr("transform", event.transform));
        svg.call(zoom);


        // Define color scale for all layouts
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        if (layoutType === 'radial') {
            // *** RADIAL LAYOUT (Tree of Life) ***
            const radius = Math.min(width, height) / 2;
            const cluster = d3.cluster().size([2 * Math.PI, radius - 150]);

            // Sort for better radial grouping
            root.sort((a, b) => d3.ascending(a.data.name, b.data.name));
            cluster(root);

            // Center the group
            svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8));

            // Links
            g.append("g")
                .attr("fill", "none")
                .attr("stroke", "#555")
                .attr("stroke-opacity", 0.4)
                .attr("stroke-width", 1.5)
                .selectAll("path")
                .data(root.links())
                .join("path")
                .attr("d", d3.linkRadial()
                    .angle(d => d.x)
                    .radius(d => d.y));

            // Nodes
            const node = g.append("g")
                .selectAll("g")
                .data(root.descendants())
                .join("g")
                .attr("transform", d => `
rotate(${d.x * 180 / Math.PI - 90})
translate(${d.y}, 0)
                `);

            node.append("circle")
                .attr("r", 3)
                .attr("fill", d => d.children ? "#555" : "#999");

            node.append("text")
                .attr("dy", "0.31em")
                .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
                .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
                .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
                .text(d => d.data.name)
                .clone(true).lower()
                .attr("stroke", "white")
                .attr("stroke-width", 3);

        } else if (layoutType === 'arc') {
            // *** ARC DIAGRAM ***

            // Linear layout of nodes based on hierarchy traversal order or just flat list
            const nodes = root.descendants();
            const links = root.links();

            // Create a scale for positioning nodes along the x-axis
            // We use a band scale but point scale is fine too.
            // Let's use point scale with some padding
            const x = d3.scalePoint()
                .domain(nodes.map(d => d.data.name)) // Use unique names or IDs! Names might collide. Use IDs.
                .range([0, width - 100])
                .padding(0.5);

            // Assign unique IDs if not present or rebuild them based on traversal
            nodes.forEach((d, i) => { d.id = i; });

            // Re-domain based on IDs to ensure order matches traversal
            x.domain(nodes.map(d => d.id));

            // Position nodes vertically in middle or near bottom
            const y = height / 2;

            // Center the group horizontally if needed, or left align with margin
            const margin = { top: 20, right: 20, bottom: 20, left: 50 };

            // Allow zooming/panning
            const gContent = g.append("g")
                .attr("transform", `translate(${margin.left}, ${y})`);

            svg.call(zoom.transform, d3.zoomIdentity.translate(margin.left, height / 2).scale(0.8));

            // Links (Arcs)
            gContent.append("g")
                .attr("fill", "none")
                .attr("stroke-width", 1.5)
                .attr("stroke-opacity", 0.6)
                .selectAll("path")
                .data(links)
                .join("path")
                .attr("stroke", d => {
                    const module = d.source.ancestors().find(a => a.depth === 1);
                    return module ? colorScale(module.data.name) : "#999";
                })
                .attr("d", d => {
                    const x1 = x(d.source.id);
                    const x2 = x(d.target.id);
                    const r = Math.abs(x2 - x1) / 2;
                    // Arc goes up (negative y relative to baseline)
                    return `M${x1},0 A${r},${r} 0 0,${x1 < x2 ? 1 : 0} ${x2},0`;
                });

            // Nodes (Circles)
            const node = gContent.append("g")
                .selectAll("circle")
                .data(nodes)
                .join("circle")
                .attr("cx", d => x(d.id))
                .attr("cy", 0)
                .attr("r", 5)
                .attr("fill", d => {
                    const module = d.ancestors().find(a => a.depth === 1);
                    return module ? colorScale(module.data.name) : "#999";
                })
                .attr("stroke", "#fff")
                .attr("stroke-width", 1);

            // Labels (Rotated)
            gContent.append("g")
                .selectAll("text")
                .data(nodes)
                .join("text")
                .attr("x", d => x(d.id))
                .attr("y", 12)
                .attr("text-anchor", "start")
                .attr("transform", d => `rotate(45, ${x(d.id)}, 12)`)
                .text(d => d.data.name)
                .attr("font-size", "10px")
                .attr("fill", d => {
                    // Get module name (depth 1 ancestor)
                    const module = d.ancestors().find(a => a.depth === 1);
                    return module ? colorScale(module.data.name) : "#333";
                });

        } else if (layoutType === 'suits') {
            // *** MOBILE PATENT SUITS (Force Directed) ***

            // Flatten hierarchy to nodes and links
            const nodes = root.descendants();
            const links = root.links();

            // Setup simulation
            const simulation = d3.forceSimulation(nodes)
                .force("link", d3.forceLink(links).id(d => d.id).distance(100).strength(1))
                .force("charge", d3.forceManyBody().strength(-400))
                .force("x", d3.forceX())
                .force("y", d3.forceY());

            // Center view
            const gContent = g.append("g")
                .attr("transform", `translate(${width / 2},${height / 2})`);

            // Add arrow marker definition if not exists
            svg.append("defs").selectAll("marker")
                .data(["suit"])
                .join("marker")
                .attr("id", d => d)
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 15) // Offset for arrow tip
                .attr("refY", -1.5)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto")
                .append("path")
                .attr("fill", "#999")
                .attr("d", "M0,-5L10,0L0,5");

            // Links (Curved Paths with Arrows)
            const link = gContent.append("g")
                .attr("fill", "none")
                .attr("stroke-width", 1.5)
                .selectAll("path")
                .data(links)
                .join("path")
                .attr("stroke", d => colorScale(d.source.data.name) || "#999") // Color by source (parent)
                .attr("marker-end", "url(#suit)");

            // Nodes (Circles with Text)
            const node = gContent.append("g")
                .attr("fill", "currentColor")
                .attr("stroke-linecap", "round")
                .attr("stroke-linejoin", "round")
                .selectAll("g")
                .data(nodes)
                .join("g")
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));

            node.append("circle")
                .attr("stroke", "white")
                .attr("stroke-width", 1.5)
                .attr("r", 6)
                .attr("fill", d => {
                    const module = d.ancestors().find(a => a.depth === 1);
                    return module ? colorScale(module.data.name) : "#555";
                });

            node.append("text")
                .attr("x", 8)
                .attr("y", "0.31em")
                .text(d => d.data.name)
                .clone(true).lower()
                .attr("fill", "none")
                .attr("stroke", "white")
                .attr("stroke-width", 3);

            simulation.on("tick", () => {
                link.attr("d", linkArc);
                node.attr("transform", d => `translate(${d.x},${d.y})`);
            });

            function linkArc(d) {
                const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
                return `
                    M${d.source.x},${d.source.y}
                    A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
                `;
            }

            // Drag functions
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

            // Initial Zoom to center
            svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.6));

        } else {
            // ... (Orthogonal logic remains)

            // Initial state: collapse nodes deeper than level 1
            root.descendants().forEach((d, i) => {
                d.id = i;
                d._children = d.children;
                if (d.depth > 1) d.children = null;
            });

            const dx = 20;
            const dy = width / 6;
            const tree = d3.tree().nodeSize([dx, dy]);

            const gLink = g.append("g")
                .attr("fill", "none")
                .attr("stroke", "#555")
                .attr("stroke-opacity", 0.4)
                .attr("stroke-width", 1.5);

            const gNode = g.append("g")
                .attr("cursor", "pointer")
                .attr("pointer-events", "all");

            // Update function for collapsing
            function update(source) {
                const duration = 250;
                const nodes = root.descendants().reverse();
                const links = root.links();

                tree(root);

                let left = root;
                let right = root;
                root.eachBefore(node => {
                    if (node.x < left.x) left = node;
                    if (node.x > right.x) right = node;
                });

                const height_calc = right.x - left.x + dx * 2;

                // Transition viewBox? No, we are using Zoom. 
                // We just center it initially or let user zoom.
                // For simplified update logic with Zoom, we don't transition viewBox.

                const transition = svg.transition()
                    .duration(duration);

                // Update nodes
                const node = gNode.selectAll("g")
                    .data(nodes, d => d.id);

                const nodeEnter = node.enter().append("g")
                    .attr("transform", d => `translate(${source.y0 || source.y}, ${source.x0 || source.x})`)
                    .attr("fill-opacity", 0)
                    .attr("stroke-opacity", 0)
                    .on("click", (event, d) => {
                        d.children = d.children ? null : d._children;
                        update(d);
                    });

                nodeEnter.append("circle")
                    .attr("r", 4)
                    .attr("fill", d => d._children ? "#0d6efd" : "#999")
                    .attr("stroke-width", 10);

                nodeEnter.append("text")
                    .attr("dy", "0.31em")
                    .attr("x", d => d._children ? -8 : 8)
                    .attr("text-anchor", d => d._children ? "end" : "start")
                    .text(d => d.data.name)
                    .style("font-weight", d => d.children ? "bold" : "normal") // Use style or attr
                    .clone(true).lower()
                    .attr("stroke-linejoin", "round")
                    .attr("stroke-width", 3)
                    .attr("stroke", "white");

                const nodeUpdate = node.merge(nodeEnter).transition(transition)
                    .attr("transform", d => `translate(${d.y}, ${d.x})`)
                    .attr("fill-opacity", 1)
                    .attr("stroke-opacity", 1);

                const nodeExit = node.exit().transition(transition).remove()
                    .attr("transform", d => `translate(${source.y}, ${source.x})`)
                    .attr("fill-opacity", 0)
                    .attr("stroke-opacity", 0);

                // Update links (Orthogonal Step)
                const link = gLink.selectAll("path")
                    .data(links, d => d.target.id);

                const stepPath = (s, t) => `M ${s.y} ${s.x} V ${t.x} H ${t.y} `;

                const linkEnter = link.enter().append("path")
                    .attr("d", d => {
                        const o = { x: source.x0 || source.x, y: source.y0 || source.y };
                        return stepPath(o, o);
                    });

                link.merge(linkEnter).transition(transition)
                    .attr("d", d => stepPath(d.source, d.target));

                link.exit().transition(transition).remove()
                    .attr("d", d => {
                        const o = { x: source.x, y: source.y };
                        return stepPath(o, o);
                    });

                root.eachBefore(d => {
                    d.x0 = d.x;
                    d.y0 = d.y;
                });
            }

            // Initial centering
            svg.call(zoom.transform, d3.zoomIdentity.translate(40, height / 2).scale(1));
            update(root);
        }

    }, [dimensions, layoutType]);

    return (
        <div ref={wrapperRef} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 100, width: '200px' }}>
                <CFormSelect
                    aria-label="Seleccionar visualización"
                    value={layoutType}
                    onChange={(e) => setLayoutType(e.target.value)}
                    options={[
                        { label: 'Estructura (Ortogonal)', value: 'orthogonal' },
                        { label: 'Tree of Life (Radial)', value: 'radial' },
                        { label: 'Arc Diagram (Lineal)', value: 'arc' },
                        { label: 'Mobile Patent Suits (Nodos)', value: 'suits' }
                    ]}
                />
            </div>
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default ProjectTidyTree;
