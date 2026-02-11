import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import ControlService from '../../service/control/control.service';
import { SocketContext } from '../../context/SocketContext';
import { CBadge, CFormSelect } from '@coreui/react-pro';
import DateRangeSelector from './DateRangeSelector';

/**
 * Optimized Force Graph for real-time device data.
 */
const DeviceDataForceGraph = ({ device_uid, device_name, width = 600, height = 600 }) => {
    const svgRef = useRef();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isResetting, setIsResetting] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null);

    const [layoutType, setLayoutType] = useState('default'); // 'default' | 'disjoint'
    const [repulsion, setRepulsion] = useState(200);

    // --- DIMENSIONS & RESIZING ---
    const [dimensions, setDimensions] = useState({ w: width, h: height });
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver(entries => {
            const { width: w, height: h } = entries[0].contentRect;
            if (w > 0 && h > 0) setDimensions({ w, h });
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    const curW = dimensions.w || width || 600;
    const curH = Math.max(dimensions.h || height || 400, 300);

    // --- FILTERS ---
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setHours(23, 59, 59, 999);
        return d;
    });
    const [isFiltered, setIsFiltered] = useState(true);

    // D3 Refs
    const simulationRef = useRef(null);
    const nodesRef = useRef([]);
    const linksRef = useRef([]);
    const gLinksRef = useRef(null);
    const gNodesRef = useRef(null);
    const batchBufferRef = useRef([]);

    // 1. FETCH LOGS
    const fetchLogs = async (isBackground = false, overrideStart = null, overrideEnd = null) => {
        if (!isBackground) setLoading(true);
        try {
            const formatForApi = (date) => {
                if (!date) return null;
                if (date instanceof Date) return date.toISOString();
                return date;
            };

            const startVal = overrideStart || startDate;
            const endVal = overrideEnd || endDate;

            const startStr = formatForApi(startVal);
            let endStr = formatForApi(endVal);

            // Inclusive local end-of-day
            if ((endVal instanceof Date) && endVal.getHours() === 0) {
                const expanded = new Date(endVal);
                expanded.setHours(23, 59, 59, 999);
                endStr = expanded.toISOString();
            }

            console.log(` [ForceGraph] Fetching logs. Range: ${startStr} - ${endStr}`);

            const [logsRes, anomsRes] = await Promise.all([
                ControlService.getDeviceLogs(device_uid, startStr, endStr),
                ControlService.getAnomalias(device_uid, startStr, endStr)
            ]);

            const logsData = (logsRes.ok && Array.isArray(logsRes.data)) ? logsRes.data : [];
            const anomsData = (anomsRes.ok && Array.isArray(anomsRes.data)) ? anomsRes.data : [];

            const logMap = new Map();
            logsData.forEach(l => { if (l && l.id) logMap.set(l.id, l); });
            anomsData.forEach(l => { if (l && l.id) logMap.set(l.id, l); });

            const finalLogs = Array.from(logMap.values())
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 500);

            console.log(`✅ [ForceGraph] Final count: ${finalLogs.length}`);
            setLogs(finalLogs);
        } catch (err) {
            console.error("❌ [ForceGraph] Error:", err);
        } finally {
            setLoading(false);
            setIsResetting(false);
        }
    };

    useEffect(() => {
        if (device_uid) fetchLogs();
    }, [device_uid]);

    const handleFilter = () => {
        setIsResetting(true);

        // NUCLEAR OPTION: Destroy everything to force a clean re-mount
        if (simulationRef.current) {
            simulationRef.current.stop();
            simulationRef.current = null;
        }

        nodesRef.current = [];
        linksRef.current = [];
        gNodesRef.current = null;
        gLinksRef.current = null;

        // Clear the SVG container completely
        if (svgRef.current) {
            d3.select(svgRef.current).selectAll("*").remove();
        }

        setIsFiltered(true);
        fetchLogs();
    };

    const handleReset = () => {
        const dStart = new Date();
        dStart.setHours(0, 0, 0, 0);
        const dEnd = new Date();
        dEnd.setHours(23, 59, 59, 999);

        setStartDate(dStart);
        setEndDate(dEnd);

        // NUCLEAR RESET with immediate new dates
        setIsResetting(true);

        if (simulationRef.current) {
            simulationRef.current.stop();
            simulationRef.current = null;
        }

        nodesRef.current = [];
        linksRef.current = [];
        gNodesRef.current = null;
        gLinksRef.current = null;

        if (svgRef.current) {
            d3.select(svgRef.current).selectAll("*").remove();
        }

        setIsFiltered(true);
        // Pass explicit today dates to avoid async state delay
        fetchLogs(false, dStart, dEnd);
    };

    // 2. SOCKETS
    const { socket } = React.useContext(SocketContext);
    useEffect(() => {
        if (!socket || !device_uid || isFiltered) return;

        const handleData = (data) => {
            if (!data || data.device_uid !== device_uid) return;
            batchBufferRef.current.push({
                id: data.id || `live-${Date.now()}`,
                device_uid,
                created_at: new Date().toISOString(),
                mean: data.mean || data.voltaje || 0,
                resultado: data
            });
        };

        socket.on('mqtt:data:update', handleData);
        socket.on('mcpdatos', handleData);
        return () => {
            socket.off('mqtt:data:update', handleData);
            socket.off('mcpdatos', handleData);
        };
    }, [socket, device_uid, isFiltered]);

    // Batch Timer
    useEffect(() => {
        const t = setInterval(() => {
            if (isFiltered || batchBufferRef.current.length === 0) return;
            const newNodes = [...batchBufferRef.current];
            batchBufferRef.current = [];
            setLogs(prev => [...newNodes, ...prev].slice(0, 100));
        }, 100);
        return () => clearInterval(t);
    }, [isFiltered]);

    // 3. D3 RENDERING
    useEffect(() => {
        if (!svgRef.current || loading) return;

        const svg = d3.select(svgRef.current).attr("viewBox", [0, 0, curW, curH]);

        if (!gLinksRef.current) {
            svg.on("click", () => setSelectedNode(null));
            gLinksRef.current = svg.append("g").attr("class", "links");
            gNodesRef.current = svg.append("g").attr("class", "nodes");

            simulationRef.current = d3.forceSimulation()
                .force("charge", d3.forceManyBody().strength(-50))
                .force("collide", d3.forceCollide().radius(d => d.size + 4))
                .velocityDecay(0.3); // Smoother stabilization

        }

        // Update simulation layout forces based on layoutType
        if (simulationRef.current) {
            if (layoutType === 'default') {
                simulationRef.current
                    .force("link", d3.forceLink().id(d => d.id).distance(d => d.isAnomaly ? 100 : 30)) // Reduced from 70
                    .force("charge", d3.forceManyBody().strength(-100)) // Use fixed repulsion for layout stability in default
                    .force("center", d3.forceCenter(curW / 2, curH / 2))
                    .force("x", null)
                    .force("y", null);
            } else {
                // Disjoint: Stronger repulsion but tighter grouping by color
                simulationRef.current
                    .force("charge", d3.forceManyBody().strength(-repulsion)) // Dynamic Repulsion
                    .force("link", null)
                    .force("center", null)
                    .force("x", d3.forceX(d => {
                        if (d.type === 'root') return curW / 2;
                        // Separation: 30% vs 70% (closer but distinct)
                        return d.isAnomaly ? curW * 0.7 : curW * 0.3;
                    }).strength(0.2)) // Stronger pull to cluster center
                    .force("y", d3.forceY(curH / 2).strength(0.2));
            }

            simulationRef.current.restart();
        }
        // Prepare Data
        const rootNode = {
            id: "Root",
            label: device_name || device_uid,
            type: "root",
            size: 15,
            color: "#0d6efd",
            fx: curW / 2,
            fy: curH / 2
        };

        const currentNodes = [rootNode];
        const currentLinks = [];

        logs.forEach(log => {
            let res = log.resultado;
            if (typeof res === 'string') try { res = JSON.parse(res); } catch (e) { res = {}; }
            const isAnom = res?.isAnomaly === true || res?.isAnomaly === 'true' || res?.is_anomaly === true;

            const nodeId = `l-${log.id}`;
            currentNodes.push({
                id: nodeId,
                label: `V:${parseFloat(log.mean).toFixed(1)}`,
                type: "data",
                size: isAnom ? 8 : 2.5, // Reduced from 4
                isAnomaly: isAnom,
                color: isAnom ? "#dc3545" : (res?.raw ? "#6c757d" : "#198754"),
                data: log
            });
            currentLinks.push({ source: "Root", target: nodeId, isAnomaly: isAnom });
        });

        const nodeMap = new Map(nodesRef.current.map(d => [d.id, d]));
        nodesRef.current = currentNodes.map(d => {
            const old = nodeMap.get(d.id);
            if (old && !isNaN(old.x) && !isNaN(old.y)) return Object.assign(old, d);

            // Add jitter and ensure safe initial coordinates
            return Object.assign(d, {
                x: curW / 2 + (Math.random() - 0.5) * 60,
                y: curH / 2 + (Math.random() - 0.5) * 60
            });
        });
        linksRef.current = currentLinks;

        const link = gLinksRef.current.selectAll("line")
            .data(linksRef.current, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
            .join("line")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.4);

        const drag = simulation => {
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }

            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }

            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }

            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        };

        const node = gNodesRef.current.selectAll("g")
            .data(nodesRef.current, d => d.id)
            .join(
                enter => {
                    const g = enter.append("g").attr("cursor", "move")
                        .call(drag(simulationRef.current))
                        .on("click", (e, d) => { e.stopPropagation(); setSelectedNode(d.type === 'data' ? d : null); });
                    g.append("circle").attr("stroke", "#fff").attr("stroke-width", 1.5);
                    g.append("text").attr("dy", "0.31em").style("pointer-events", "none").style("font-size", "10px");
                    return g;
                }
            );

        node.select("circle").attr("r", d => d.size).attr("fill", d => d.color);
        node.select("text").text(d => d.type === 'root' ? d.label : "").attr("x", d => d.size + 5);

        simulationRef.current.nodes(nodesRef.current);

        // Link update only if layoutType is default (where link force exists)
        if (layoutType === 'default') {
            simulationRef.current.force("link").links(linksRef.current);
        }

        simulationRef.current.alpha(1).restart();

        simulationRef.current.on("tick", () => {
            if (layoutType === 'default') {
                link
                    .attr("x1", d => isNaN(d.source.x) ? curW / 2 : d.source.x)
                    .attr("y1", d => isNaN(d.source.y) ? curH / 2 : d.source.y)
                    .attr("x2", d => isNaN(d.target.x) ? curW / 2 : d.target.x)
                    .attr("y2", d => isNaN(d.target.y) ? curH / 2 : d.target.y)
                    .attr("display", null);
            } else {
                link.attr("display", "none");
            }

            node.attr("transform", d => {
                const tx = !isNaN(d.x) ? d.x : curW / 2;
                const ty = !isNaN(d.y) ? d.y : curH / 2;
                return `translate(${tx},${ty})`;
            });
        });

    }, [logs, loading, isResetting, curW, curH, device_uid, device_name, layoutType, repulsion]);

    if (loading) return (
        <div style={{ minHeight: '400px' }} className="w-100 d-flex justify-content-center align-items-center bg-light border rounded">
            <div className="spinner-border text-primary me-2"></div>
            <span>Cargando datos históricos...</span>
        </div>
    );

    return (
        <div ref={containerRef} style={{
            width: '100%', minHeight: '500px', height: '100%',
            position: 'relative', overflow: 'hidden', background: '#fff',
            border: '1px solid #dee2e6', borderRadius: '12px',
            display: 'flex', flexDirection: 'column'
        }}>

            <DateRangeSelector
                startDate={startDate} endDate={endDate}
                onStartDateChange={setStartDate} onEndDateChange={setEndDate}
                onFilter={handleFilter}
                onReset={handleReset}
                isFiltered={isFiltered}
            />

            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 100, width: '220px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                <CFormSelect
                    size="sm"
                    value={layoutType}
                    onChange={(e) => setLayoutType(e.target.value)}
                    options={[
                        { label: 'Centralizado (Default)', value: 'default' },
                        { label: 'Disjoint (Cluster)', value: 'disjoint' }
                    ]}
                />

                {layoutType === 'disjoint' && (
                    <div className="bg-white p-2 border rounded shadow-sm" style={{ width: '100%' }}>
                        <label htmlFor="repulsionRange" className="form-label" style={{ fontSize: '10px' }}>
                            Densidad / Repulsión: {repulsion}
                        </label>
                        <input
                            type="range"
                            className="form-range"
                            min="50"
                            max="500"
                            step="10"
                            value={repulsion}
                            onChange={(e) => setRepulsion(Number(e.target.value))}
                            id="repulsionRange"
                        />
                    </div>
                )}
            </div>

            {(loading || isResetting) && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(255,255,255,0.7)', zIndex: 1000,
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div className="spinner-border text-primary mb-2"></div>
                    <strong className="text-primary">{isResetting ? 'Reiniciando gráfica...' : 'Cargando datos...'}</strong>
                </div>
            )}

            <div style={{ position: 'absolute', bottom: '15px', left: '15px', zIndex: 10, display: 'flex', gap: '8px' }}>
                <CBadge color="primary" shape="rounded-pill">Nodos: {logs.length}</CBadge>
                <CBadge color="dark" shape="rounded-pill" variant="outline">{curW}x{curH}</CBadge>
            </div>

            <svg ref={svgRef} style={{ flexGrow: 1, width: '100%', height: '100%', WebkitTapHighlightColor: 'transparent', background: '#f8f9fa' }}></svg>

            {selectedNode && (
                <div style={{
                    position: 'absolute', top: '15px', right: '15px', width: '200px',
                    background: 'white', border: '1px solid #ddd', borderRadius: '8px',
                    padding: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', zIndex: 100, fontSize: '11px'
                }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong>Detalle Nodo</strong>
                        <button className="btn-close" style={{ fontSize: '8px' }} onClick={() => setSelectedNode(null)}></button>
                    </div>
                    <p className="mb-1"><strong>Voltaje:</strong> {parseFloat(selectedNode.data?.mean).toFixed(2)}V</p>
                    <p className="mb-0 text-muted">{new Date(selectedNode.data?.created_at).toLocaleString()}</p>
                </div>
            )}
        </div>
    );
};

export default DeviceDataForceGraph;
