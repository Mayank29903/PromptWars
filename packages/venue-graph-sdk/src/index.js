// ═══════════════════════════════════════════════════════════════════════
//  @ag/venue-graph-sdk — Client-Side Venue Navigation Graph
//  JavaScript counterpart to the Python EvacuationRouter.
// ═══════════════════════════════════════════════════════════════════════

/**
 * VenueGraph — In-memory navigation graph for venue pathfinding.
 * Supports A* shortest path, zone queries, exit lookups, and GeoJSON export.
 */
export class VenueGraph {
  /**
   * @param {Array} nodes - Array of NavigationNode objects
   */
  constructor(nodes = []) {
    /** @type {Map<string, object>} */
    this.nodes = new Map();
    /** @type {Map<string, Set<string>>} */
    this.adjacency = new Map();

    for (const node of nodes) {
      this.addNode(node);
    }
  }

  /**
   * Add a node and wire its edges.
   * @param {object} node - NavigationNode with node_id, coords, node_type, connected_node_ids
   */
  addNode(node) {
    this.nodes.set(node.node_id, { ...node });
    if (!this.adjacency.has(node.node_id)) {
      this.adjacency.set(node.node_id, new Set());
    }
    for (const neighborId of (node.connected_node_ids || [])) {
      this.adjacency.get(node.node_id).add(neighborId);
      // Ensure reverse adjacency entry exists
      if (!this.adjacency.has(neighborId)) {
        this.adjacency.set(neighborId, new Set());
      }
    }
  }

  /**
   * Get a node by ID.
   * @param {string} nodeId
   * @returns {object|undefined}
   */
  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }

  /**
   * Get neighbor node IDs.
   * @param {string} nodeId
   * @returns {string[]}
   */
  getNeighbors(nodeId) {
    const adj = this.adjacency.get(nodeId);
    return adj ? [...adj] : [];
  }

  /**
   * Get all EXIT or GATE nodes.
   * @returns {object[]}
   */
  getExitNodes() {
    const exits = [];
    for (const node of this.nodes.values()) {
      if (node.node_type === 'EXIT' || node.node_type === 'GATE') {
        exits.push(node);
      }
    }
    return exits;
  }

  /**
   * Get all nodes belonging to a specific zone.
   * @param {string} zoneId
   * @returns {object[]}
   */
  getZoneNodes(zoneId) {
    const result = [];
    for (const node of this.nodes.values()) {
      if (node.zone_id === zoneId) {
        result.push(node);
      }
    }
    return result;
  }

  /**
   * Euclidean distance between two nodes (for A* heuristic).
   * @private
   */
  _distance(nodeA, nodeB) {
    const [x1, y1] = nodeA.coords || [0, 0];
    const [x2, y2] = nodeB.coords || [0, 0];
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  /**
   * A* pathfinding from one node to another.
   * @param {string} fromId - Start node ID
   * @param {string} toId - Goal node ID
   * @returns {{ path: string[], distance: number } | null}
   */
  findShortestPath(fromId, toId) {
    const startNode = this.nodes.get(fromId);
    const goalNode = this.nodes.get(toId);
    if (!startNode || !goalNode) return null;

    const openSet = new Set([fromId]);
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    gScore.set(fromId, 0);
    fScore.set(fromId, this._distance(startNode, goalNode));

    while (openSet.size > 0) {
      // Pick node in openSet with lowest fScore
      let current = null;
      let lowestF = Infinity;
      for (const id of openSet) {
        const f = fScore.get(id) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          current = id;
        }
      }

      if (current === toId) {
        // Reconstruct path
        const path = [current];
        let walk = current;
        while (cameFrom.has(walk)) {
          walk = cameFrom.get(walk);
          path.unshift(walk);
        }
        return { path, distance: gScore.get(toId) };
      }

      openSet.delete(current);
      const currentNode = this.nodes.get(current);

      for (const neighborId of this.getNeighbors(current)) {
        const neighborNode = this.nodes.get(neighborId);
        if (!neighborNode) continue;
        // Skip emergency vehicle only nodes
        if (neighborNode.node_type === 'EMERGENCY_VEHICLE_ONLY') continue;

        const tentativeG = (gScore.get(current) ?? Infinity) + this._distance(currentNode, neighborNode);
        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, current);
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + this._distance(neighborNode, goalNode));
          openSet.add(neighborId);
        }
      }
    }

    return null; // No path found
  }

  /**
   * Convert graph to GeoJSON FeatureCollection.
   * Nodes become Point features, edges become LineString features.
   * @returns {object} GeoJSON FeatureCollection
   */
  toGeoJSON() {
    const features = [];

    // Nodes as Point features
    for (const node of this.nodes.values()) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: node.coords || [0, 0]
        },
        properties: {
          node_id:   node.node_id,
          node_type: node.node_type,
          floor:     node.floor || 0,
          zone_id:   node.zone_id || ''
        }
      });
    }

    // Edges as LineString features
    const drawnEdges = new Set();
    for (const [nodeId, neighbors] of this.adjacency.entries()) {
      const fromNode = this.nodes.get(nodeId);
      if (!fromNode) continue;

      for (const neighborId of neighbors) {
        const edgeKey = [nodeId, neighborId].sort().join('->');
        if (drawnEdges.has(edgeKey)) continue;
        drawnEdges.add(edgeKey);

        const toNode = this.nodes.get(neighborId);
        if (!toNode) continue;

        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [fromNode.coords || [0, 0], toNode.coords || [0, 0]]
          },
          properties: {
            from: nodeId,
            to:   neighborId,
            distance: this._distance(fromNode, toNode)
          }
        });
      }
    }

    return { type: 'FeatureCollection', features };
  }
}


/**
 * VenueGraphBuilder — Factory for constructing VenueGraph instances.
 */
export class VenueGraphBuilder {

  /**
   * Build a VenueGraph from the API response of GET /api/v1/nav/graph.
   * @param {object} apiData - { success: true, data: { nodes: [...] } }
   * @returns {VenueGraph}
   */
  static fromApiResponse(apiData) {
    const nodes = apiData?.data?.nodes || apiData?.nodes || [];
    return new VenueGraph(nodes);
  }

  /**
   * Create a hardcoded demo graph for Manchester Arena.
   * 8 nodes: 4 walkable junctions, 2 gates, 2 exits.
   * @returns {VenueGraph}
   */
  static createDemoGraph() {
    const nodes = [
      // Walkable junctions — interior concourse
      {
        node_id: 'jnc-north',  floor: 0, coords: [100, 140],
        node_type: 'WALKABLE_JUNCTION', zone_id: 'zone-north-stand',
        connected_node_ids: ['jnc-east', 'jnc-west', 'gate-nw', 'gate-ne']
      },
      {
        node_id: 'jnc-south',  floor: 0, coords: [100, 20],
        node_type: 'WALKABLE_JUNCTION', zone_id: 'zone-south-food',
        connected_node_ids: ['jnc-east', 'jnc-west', 'exit-sw', 'exit-se']
      },
      {
        node_id: 'jnc-east',   floor: 0, coords: [180, 75],
        node_type: 'WALKABLE_JUNCTION', zone_id: 'zone-east-stand',
        connected_node_ids: ['jnc-north', 'jnc-south', 'gate-ne', 'exit-se']
      },
      {
        node_id: 'jnc-west',   floor: 0, coords: [20, 75],
        node_type: 'WALKABLE_JUNCTION', zone_id: 'zone-west-stand',
        connected_node_ids: ['jnc-north', 'jnc-south', 'gate-nw', 'exit-sw']
      },

      // Gates — entry points
      {
        node_id: 'gate-nw',    floor: 0, coords: [10, 140],
        node_type: 'GATE', zone_id: 'zone-gate-nw',
        connected_node_ids: ['jnc-north', 'jnc-west']
      },
      {
        node_id: 'gate-ne',    floor: 0, coords: [190, 140],
        node_type: 'GATE', zone_id: 'zone-gate-ne',
        connected_node_ids: ['jnc-north', 'jnc-east']
      },

      // Exits — evacuation endpoints
      {
        node_id: 'exit-sw',    floor: 0, coords: [10, 10],
        node_type: 'EXIT', zone_id: 'zone-gate-sw',
        connected_node_ids: ['jnc-south', 'jnc-west']
      },
      {
        node_id: 'exit-se',    floor: 0, coords: [190, 10],
        node_type: 'EXIT', zone_id: 'zone-gate-se',
        connected_node_ids: ['jnc-south', 'jnc-east']
      }
    ];

    return new VenueGraph(nodes);
  }
}
