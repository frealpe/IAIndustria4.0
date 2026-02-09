import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const AdcRealtimeChartD3 = ({ data = [], width = 'container', height = 400, compact = false }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const brushSelectionRef = useRef(null); // Persist brush selection
    const [dimensions, setDimensions] = useState({ width: 800, height: height });

    // Update dimensions on mount and resize
    useEffect(() => {
        if (!containerRef.current) return;

        const updateDimensions = () => {
            const { width: containerWidth } = containerRef.current.getBoundingClientRect();
            setDimensions({
                width: containerWidth || 800,
                height: height
            });
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [height]);

    // D3 chart rendering
    useEffect(() => {
        if (!data || data.length === 0 || !svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove(); // Clear previous content

        // Configuration based on compact mode
        const margin = compact
            ? { top: 10, right: 10, bottom: 20, left: 40 }
            : { top: 20, right: 30, bottom: 110, left: 60 };

        const width = dimensions.width - margin.left - margin.right;

        let mainHeight;
        let height2;
        let margin2;

        if (compact) {
            mainHeight = dimensions.height - margin.top - margin.bottom;
            height2 = 0;
            margin2 = { top: 0, right: 0, bottom: 0, left: 0 };
        } else {
            mainHeight = dimensions.height - margin.top - margin.bottom;
            margin2 = { top: dimensions.height - 70, right: 30, bottom: 30, left: 60 };
            height2 = dimensions.height - margin2.top - margin2.bottom;
        }

        // Parse timestamps and prepare data
        const processedData = data.map(d => ({
            ...d,
            timestamp: d.timestamp instanceof Date ? d.timestamp : new Date(d.timestamp),
            voltaje: +d.voltaje
        }));

        // Scales for main chart (focus)
        const x = d3.scaleTime()
            .domain(d3.extent(processedData, d => d.timestamp))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([d3.min(processedData, d => d.voltaje) * 0.95, d3.max(processedData, d => d.voltaje) * 1.05])
            .range([mainHeight, 0]);

        // Line generator for main chart
        const line = d3.line()
            .curve(d3.curveMonotoneX)
            .x(d => x(d.timestamp))
            .y(d => y(d.voltaje));

        // Clip path
        svg.append('defs')
            .append('clipPath')
            .attr('id', 'clip')
            .append('rect')
            .attr('width', width)
            .attr('height', mainHeight);

        // Main chart group (Focus)
        const focus = svg.append('g')
            .attr('class', 'focus')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Add main line
        focus.append('path')
            .datum(processedData)
            .attr('class', 'line')
            .attr('clip-path', 'url(#clip)')
            .style('fill', 'none')
            .style('stroke', '#d62728')
            .style('stroke-width', 2)
            .attr('d', line);

        // Add dots (circles)
        focus.selectAll('.dot')
            .data(processedData)
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('clip-path', 'url(#clip)')
            .attr('cx', d => x(d.timestamp))
            .attr('cy', d => y(d.voltaje))
            .attr('r', d => d.isAnomaly ? 5 : 3)
            .style('fill', d => d.isAnomaly ? '#dc2626' : '#2563eb')
            .style('stroke', '#fff')
            .style('stroke-width', d => d.isAnomaly ? 2 : 1.5)
            .style('opacity', d => d.isAnomaly ? 1 : 0.8);

        // Add Axes
        const xAxis = d3.axisBottom(x).ticks(compact ? 3 : 5);
        const yAxis = d3.axisLeft(y).ticks(5);

        focus.append('g')
            .attr('class', 'axis axis--x')
            .attr('transform', `translate(0,${mainHeight})`)
            .call(xAxis);

        focus.append('g')
            .attr('class', 'axis axis--y')
            .call(yAxis);

        // Y-Axis Label
        focus.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 6)
            .attr('dy', '0.71em')
            .attr('fill', '#000')
            .style('text-anchor', 'end')
            .style('font-size', '10px')
            .text(compact ? 'V' : 'Avg Voltaje');

        // --- Context Chart / Brush (Only if NOT compact) ---
        if (!compact) {
            const x2 = d3.scaleTime()
                .domain(d3.extent(processedData, d => d.timestamp))
                .range([0, width]);

            const y2 = d3.scaleLinear()
                .domain(y.domain())
                .range([height2, 0]);

            const line2 = d3.line()
                .curve(d3.curveMonotoneX)
                .x(d => x2(d.timestamp))
                .y(d => y2(d.voltaje));

            const context = svg.append('g')
                .attr('class', 'context')
                .attr('transform', `translate(${margin2.left},${margin2.top})`);

            context.append('path')
                .datum(processedData)
                .attr('class', 'line')
                .style('fill', 'none')
                .style('stroke', '#999')
                .style('stroke-width', 1)
                .attr('d', line2);

            context.append('g')
                .attr('class', 'axis axis--x')
                .attr('transform', `translate(0,${height2})`)
                .call(d3.axisBottom(x2));

            const brush = d3.brushX()
                .extent([[0, 0], [width, height2]])
                .on('end', (event) => {
                    if (event.sourceEvent && event.sourceEvent.type === 'zoom') return;
                    const selection = event.selection || x2.range();
                    const domain = selection.map(x2.invert, x2);
                    brushSelectionRef.current = domain;
                    x.domain(domain);
                    focus.select('.line').attr('d', line);
                    focus.selectAll('.dot').attr('cx', d => x(d.timestamp)).attr('cy', d => y(d.voltaje));
                    focus.select('.axis--x').call(xAxis);
                });

            const brushG = context.append('g')
                .attr('class', 'brush')
                .call(brush);

            // Initialize brush
            if (brushSelectionRef.current) {
                const [d0, d1] = brushSelectionRef.current;
                const dataDomain = x2.domain();
                const safeD0 = d0 < dataDomain[0] ? dataDomain[0] : d0;
                const safeD1 = d1 > dataDomain[1] ? dataDomain[1] : d1;
                brushG.call(brush.move, [x2(safeD0), x2(safeD1)]);
            } else {
                brushG.call(brush.move, x2.range());
            }
        }

        // Tooltip logic
        const tooltip = d3.select('body').selectAll('.d3-tooltip-adc')
            .data([0])
            .join('div')
            .attr('class', 'd3-tooltip-adc')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', 10000);

        // Overlay for interaction
        focus.append('rect')
            .attr('class', 'overlay')
            .attr('width', width)
            .attr('height', mainHeight)
            .style('fill', 'none')
            .style('pointer-events', 'all')
            .on('mousemove', function (event) {
                const [mouseX] = d3.pointer(event);
                const x0 = x.invert(mouseX);
                const bisect = d3.bisector(d => d.timestamp).left;
                const i = bisect(processedData, x0, 1);
                const d0 = processedData[i - 1];
                const d1 = processedData[i];
                const d = x0 - d0?.timestamp > d1?.timestamp - x0 ? d1 : d0;

                if (d) {
                    tooltip
                        .style('visibility', 'visible')
                        .html(`
                            <strong>Valor:</strong> ${d.voltaje.toFixed(2)}<br/>
                            <strong>Tiempo:</strong> ${d.timestamp.toLocaleTimeString()}<br/>
                            ${d.isAnomaly ? '<strong style="color: #dc2626;">⚠ ANOMALÍA</strong>' : ''}
                        `)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 10) + 'px');
                }
            })
            .on('mouseout', () => {
                tooltip.style('visibility', 'hidden');
            });

        return () => {
            tooltip.style('visibility', 'hidden');
        };

    }, [data, dimensions, compact]);

    if (!data || data.length === 0) {
        return (
            <div className="text-center text-muted p-5">
                Esperando datos...
            </div>
        );
    }

    const currentDeviceId = data[data.length - 1]?.deviceId || data[data.length - 1]?.deviceUid || 'Desconocido';

    return (
        <div ref={containerRef} className="w-100 border rounded p-2 bg-white">
            {!compact && (
                <h6 className="text-primary text-center mb-2">
                    {currentDeviceId} <small className="text-muted">({data.length} pts)</small>
                </h6>
            )}
            <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                style={{ display: 'block', margin: '0 auto' }}
            />
        </div>
    );
};

export default AdcRealtimeChartD3;
