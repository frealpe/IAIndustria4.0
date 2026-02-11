import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import ControlService from '../../service/control/control.service';
import { SocketContext } from '../../context/SocketContext';
import { CBadge } from '@coreui/react-pro';
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
    const fetchLogs = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const formatForApi = (date) => {
                if (!date) return null;
                if (date instanceof Date) return date.toISOString();
                return date;
            };

            const startStr = formatForApi(startDate);
            let endStr = formatForApi(endDate);

            // Inclusive local end-of-day
            if (endDate instanceof Date && endDate.getHours() === 0) {
                const expanded = new Date(endDate);
                expanded.setHours(23, 59, 59, 999);
                endStr = expanded.toISOString();
            }

            console.log(`� [ForceGraph] Fetching logs. Range: ${startStr} - ${endStr}`);

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
                .force("link", d3.forceLink().id(d => d.id).distance(d => d.isAnomaly ? 100 : 70))
                .force("charge", d3.forceManyBody().strength(-100)) // Stronger repulsion for high node counts
                .force("center", d3.forceCenter(curW / 2, curH / 2))
                .force("collide", d3.forceCollide().radius(d => d.size + 4))
                .velocityDecay(0.3); // Smoother stabilization
        } else {
            simulationRef.current.force("center", d3.forceCenter(curW / 2, curH / 2));
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
                size: isAnom ? 8 : 4,
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

        const node = gNodesRef.current.selectAll("g")
            .data(nodesRef.current, d => d.id)
            .join(
                enter => {
                    const g = enter.append("g").attr("cursor", "pointer")
                        .on("click", (e, d) => { e.stopPropagation(); setSelectedNode(d.type === 'data' ? d : null); });
                    g.append("circle").attr("stroke", "#fff").attr("stroke-width", 1.5);
                    g.append("text").attr("dy", "0.31em").style("pointer-events", "none").style("font-size", "10px");
                    return g;
                }
            );

        node.select("circle").attr("r", d => d.size).attr("fill", d => d.color);
        node.select("text").text(d => d.type === 'root' ? d.label : "").attr("x", d => d.size + 5);

        simulationRef.current.nodes(nodesRef.current);
        simulationRef.current.force("link").links(linksRef.current);
        simulationRef.current.alpha(1).restart();

        simulationRef.current.on("tick", () => {
            link.attr("x1", d => isNaN(d.source.x) ? curW / 2 : d.source.x)
                .attr("y1", d => isNaN(d.source.y) ? curH / 2 : d.source.y)
                .attr("x2", d => isNaN(d.target.x) ? curW / 2 : d.target.x)
                .attr("y2", d => isNaN(d.target.y) ? curH / 2 : d.target.y);

            node.attr("transform", d => {
                const tx = !isNaN(d.x) ? d.x : curW / 2;
                const ty = !isNaN(d.y) ? d.y : curH / 2;
                return `translate(${tx},${ty})`;
            });
        });

    }, [logs, loading, isResetting, curW, curH, device_uid, device_name]);

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
                onReset={() => { setStartDate(null); setEndDate(null); setIsFiltered(false); }}
                isFiltered={isFiltered}
            />

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
