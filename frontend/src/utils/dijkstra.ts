export interface Node {
    id: string;
    lat: number;
    lon: number;
}

export interface Edge {
    from: string;
    to: string;
    weight: number;
    type: 'ROAD' | 'FLIGHT' | 'HELI';
}

export interface Graph {
    nodes: Node[];
    edges: Edge[];
}

export interface RiskContext {
    currentRisk: number; // 0-100
    floodedNodeIds: string[];
}

/**
 * Calculates the distance between two points using the Haversine formula (in km).
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon1 - lon2) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Dijkstra's Algorithm for find the shortest path in the graph.
 * Now 'Flood-Aware': Penalizes or blocks paths through high-risk zones.
 */
export function findShortestPath(graph: Graph, startNodeId: string, endNodeId: string, riskContext?: RiskContext): string[] {
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const nodes = new Set<string>();

    graph.nodes.forEach(node => {
        distances[node.id] = Infinity;
        previous[node.id] = null;
        nodes.add(node.id);
    });

    distances[startNodeId] = 0;

    while (nodes.size > 0) {
        // Find node with minimum distance
        let closestNodeId: string | null = null;
        nodes.forEach(nodeId => {
            if (closestNodeId === null || distances[nodeId] < distances[closestNodeId]) {
                closestNodeId = nodeId;
            }
        });

        if (closestNodeId === null || distances[closestNodeId] === Infinity) break;
        if (closestNodeId === endNodeId) break;

        nodes.delete(closestNodeId);

        // Update distances to neighbors
        const neighbors = graph.edges.filter(edge => edge.from === closestNodeId);
        neighbors.forEach(edge => {
            let traversalCost = edge.weight;

            // ELITE TIER: Risk-Aware Penalty
            if (riskContext) {
                // If the target node is in a flooded zone, add massive penalty
                if (riskContext.floodedNodeIds.includes(edge.to)) {
                    traversalCost *= (1 + (riskContext.currentRisk / 10)); // Up to 11x penalty
                }
            }

            const alt = distances[closestNodeId!] + traversalCost;
            if (alt < distances[edge.to]) {
                distances[edge.to] = alt;
                previous[edge.to] = closestNodeId;
            }
        });
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | null = endNodeId;
    while (current !== null) {
        path.unshift(current);
        current = previous[current];
    }

    return path[0] === startNodeId ? path : [];
}
