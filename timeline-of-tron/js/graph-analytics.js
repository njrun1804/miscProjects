/**
 * Graph Analytics Module
 * Advanced graph theory algorithms for constellation network analysis
 * Implements PageRank, betweenness centrality, clustering, community detection, etc.
 *
 * No external dependencies — pure JavaScript implementation
 */

/**
 * Extracts name from node identifier (handles both string and object forms)
 * @param {string|{name: string}} node
 * @returns {string}
 */
function getName(node) {
  return typeof node === 'string' ? node : node.name;
}

/**
 * Normalizes a map of scores to 0-1 range
 * @param {Map} scoreMap
 * @returns {Map}
 */
function normalizeScores(scoreMap) {
  const values = Array.from(scoreMap.values());
  if (values.length === 0) return new Map();

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const normalized = new Map();
  for (const [key, value] of scoreMap) {
    normalized.set(key, (value - min) / range);
  }
  return normalized;
}

/**
 * Builds adjacency list from nodes and links
 * Handles both string and object node references
 * @param {Array} nodes
 * @param {Array} links
 * @returns {Map<string, Set<string>>}
 */
function buildAdjacencyList(nodes, links) {
  const nodeNames = new Set();
  for (const node of nodes) {
    nodeNames.add(getName(node));
  }

  const adjacency = new Map();
  for (const name of nodeNames) {
    adjacency.set(name, new Set());
  }

  for (const link of links) {
    const source = getName(link.source);
    const target = getName(link.target);

    // Skip self-loops
    if (source === target) continue;

    // Only add if both nodes exist
    if (nodeNames.has(source) && nodeNames.has(target)) {
      adjacency.get(source).add(target);
      adjacency.get(target).add(source); // Undirected graph
    }
  }

  return adjacency;
}

/**
 * Computes PageRank scores for all nodes
 * Standard PageRank with damping factor and random teleportation
 *
 * @param {Array<{name: string}>} nodes - Array of node objects
 * @param {Array} links - Array of link objects with source/target
 * @param {number} damping - Damping factor (0.85 default)
 * @param {number} iterations - Number of iterations (100 default)
 * @returns {Map<string, number>} - Map of name → normalized pageRank (0-1)
 */
export function computePageRank(nodes, links, damping = 0.85, iterations = 100) {
  const nodeNames = nodes.map(n => getName(n));
  const n = nodeNames.length;

  if (n === 0) return new Map();

  const adjacency = buildAdjacencyList(nodes, links);

  // Initialize ranks
  const ranks = new Map();
  for (const name of nodeNames) {
    ranks.set(name, 1 / n);
  }

  // Compute out-degrees
  const outDegrees = new Map();
  for (const name of nodeNames) {
    const neighbors = adjacency.get(name);
    outDegrees.set(name, neighbors.size || 1); // Avoid division by zero
  }

  const teleportValue = (1 - damping) / n;

  // Iterative computation
  for (let iter = 0; iter < iterations; iter++) {
    const newRanks = new Map();

    for (const name of nodeNames) {
      let rank = teleportValue;

      // Sum contributions from incoming edges
      for (const neighbor of adjacency.get(name)) {
        rank += damping * (ranks.get(neighbor) / outDegrees.get(neighbor));
      }

      newRanks.set(name, rank);
    }

    ranks.clear();
    for (const [name, rank] of newRanks) {
      ranks.set(name, rank);
    }
  }

  return normalizeScores(ranks);
}

/**
 * Computes betweenness centrality using Brandes' algorithm
 * Measures how often a node appears on shortest paths between other nodes
 * Identifies "bridge" people connecting different clusters
 *
 * @param {Array<{name: string}>} nodes - Array of node objects
 * @param {Array} links - Array of link objects
 * @returns {Map<string, number>} - Map of name → normalized betweenness (0-1)
 */
export function computeBetweenness(nodes, links) {
  const nodeNames = nodes.map(n => getName(n));
  const n = nodeNames.length;

  if (n < 3) return new Map();

  const adjacency = buildAdjacencyList(nodes, links);
  const betweenness = new Map();

  for (const name of nodeNames) {
    betweenness.set(name, 0);
  }

  // For each source node, compute shortest-path DAG and accumulate
  for (const source of nodeNames) {
    const distance = new Map();
    const predecessors = new Map();
    const sigma = new Map(); // Number of shortest paths

    for (const node of nodeNames) {
      distance.set(node, node === source ? 0 : Infinity);
      predecessors.set(node, []);
      sigma.set(node, 0);
    }
    sigma.set(source, 1);

    // BFS to compute shortest paths
    const queue = [source];
    const order = [];

    while (queue.length > 0) {
      const u = queue.shift();
      order.push(u);

      for (const v of adjacency.get(u)) {
        // First time finding path to v
        if (distance.get(v) === Infinity) {
          distance.set(v, distance.get(u) + 1);
          queue.push(v);
        }

        // Shortest path to v via u
        if (distance.get(v) === distance.get(u) + 1) {
          sigma.set(v, sigma.get(v) + sigma.get(u));
          predecessors.get(v).push(u);
        }
      }
    }

    // Accumulation step (backwards)
    const delta = new Map();
    for (const node of nodeNames) {
      delta.set(node, 0);
    }

    for (let i = order.length - 1; i >= 0; i--) {
      const w = order[i];
      for (const v of predecessors.get(w)) {
        const contribution = (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w));
        delta.set(v, delta.get(v) + contribution);
      }

      if (w !== source) {
        betweenness.set(w, betweenness.get(w) + delta.get(w));
      }
    }
  }

  return normalizeScores(betweenness);
}

/**
 * Computes clustering coefficient for each node
 * Measures how many neighbors are connected to each other (0-1)
 * High = tight clique; Low = bridges separate groups
 *
 * @param {Array<{name: string}>} nodes - Array of node objects
 * @param {Array} links - Array of link objects
 * @returns {Map<string, number>} - Map of name → clustering coefficient
 */
export function computeClusteringCoeff(nodes, links) {
  const nodeNames = nodes.map(n => getName(n));
  const adjacency = buildAdjacencyList(nodes, links);
  const clustering = new Map();

  for (const node of nodeNames) {
    const neighbors = Array.from(adjacency.get(node));
    const k = neighbors.length;

    if (k < 2) {
      clustering.set(node, 0);
      continue;
    }

    // Count edges between neighbors
    let edges = 0;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        if (adjacency.get(neighbors[i]).has(neighbors[j])) {
          edges++;
        }
      }
    }

    const maxEdges = (k * (k - 1)) / 2;
    clustering.set(node, edges / maxEdges);
  }

  return clustering;
}

/**
 * Detects communities using greedy modularity optimization (simplified Louvain)
 * Identifies clusters of densely-connected nodes
 *
 * @param {Array<{name: string}>} nodes - Array of node objects
 * @param {Array} links - Array of link objects
 * @returns {{communities: Map<string, number>, modularity: number, communityColors: Map<number, string>}}
 */
export function detectCommunities(nodes, links) {
  const nodeNames = nodes.map(n => getName(n));
  const adjacency = buildAdjacencyList(nodes, links);

  // Initialize each node in its own community
  const communities = new Map();
  for (let i = 0; i < nodeNames.length; i++) {
    communities.set(nodeNames[i], i);
  }

  let improved = true;
  let bestModularity = computeModularity(adjacency, communities, nodeNames.length);

  // Greedy optimization
  while (improved) {
    improved = false;

    for (const node of nodeNames) {
      const currentCommunity = communities.get(node);
      let bestGain = 0;
      let bestNewCommunity = currentCommunity;

      // Try moving to each neighbor's community
      const neighborCommunities = new Set();
      for (const neighbor of adjacency.get(node)) {
        neighborCommunities.add(communities.get(neighbor));
      }
      neighborCommunities.add(currentCommunity);

      for (const newCommunity of neighborCommunities) {
        communities.set(node, newCommunity);
        const newModularity = computeModularity(adjacency, communities, nodeNames.length);
        const gain = newModularity - bestModularity;

        if (gain > bestGain) {
          bestGain = gain;
          bestNewCommunity = newCommunity;
        }
      }

      communities.set(node, bestNewCommunity);
      if (bestGain > 0) {
        improved = true;
        bestModularity += bestGain;
      }
    }
  }

  // Assign colors to communities
  const uniqueCommunities = Array.from(new Set(communities.values())).sort((a, b) => a - b);
  const palette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];

  const communityColors = new Map();
  for (let i = 0; i < uniqueCommunities.length; i++) {
    communityColors.set(uniqueCommunities[i], palette[i % palette.length]);
  }

  return {
    communities,
    modularity: bestModularity,
    communityColors
  };
}

/**
 * Computes modularity score for current community assignment
 * Higher score = better community structure
 *
 * @private
 * @param {Map<string, Set<string>>} adjacency
 * @param {Map<string, number>} communities
 * @param {number} n
 * @returns {number}
 */
function computeModularity(adjacency, communities, n) {
  let modularity = 0;
  const m = Array.from(adjacency.values()).reduce((sum, neighbors) => sum + neighbors.size, 0) / 2;

  if (m === 0) return 0;

  const degree = new Map();
  for (const [node, neighbors] of adjacency) {
    degree.set(node, neighbors.size);
  }

  const communityMap = new Map();
  for (const [node, community] of communities) {
    if (!communityMap.has(community)) {
      communityMap.set(community, []);
    }
    communityMap.get(community).push(node);
  }

  for (const nodes of communityMap.values()) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i; j < nodes.length; j++) {
        const u = nodes[i];
        const v = nodes[j];

        const aij = u === v ? 0 : (adjacency.get(u).has(v) ? 1 : 0);
        const expected = (degree.get(u) * degree.get(v)) / (2 * m);
        modularity += aij - expected;
      }
    }
  }

  return modularity / (2 * m);
}

/**
 * Computes relationship strength with temporal decay
 * Combines edge weight, co-occurrences, recency, and mutual connections
 *
 * @param {Array<{name: string}>} nodes
 * @param {Array} links - Links with optional .weight property
 * @param {Map} coOccurrences - Map of "nameA|nameB" → count
 * @param {Array} arcData - Array of people with first_year/last_year
 * @param {number} currentYear - Current year (default 2026)
 * @returns {Map<string, {strength: number, decay: number, recency: number, mutualCount: number}>}
 */
export function computeRelationshipStrength(nodes, links, coOccurrences = new Map(), arcData = [], currentYear = 2026) {
  const nodeNames = new Set(nodes.map(n => getName(n)));
  const adjacency = buildAdjacencyList(nodes, links);

  // Build person data map (supports both .name and .person keys)
  const personData = new Map();
  for (const person of arcData) {
    const pName = person.name || person.person;
    if (pName) personData.set(pName, person);
  }

  const strengthMap = new Map();
  const processedPairs = new Set();

  for (const link of links) {
    const source = getName(link.source);
    const target = getName(link.target);

    if (source === target) continue;
    if (!nodeNames.has(source) || !nodeNames.has(target)) continue;

    // Normalize pair key
    const [nameA, nameB] = source < target ? [source, target] : [target, source];
    const pairKey = `${nameA}|${nameB}`;

    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    let strength = link.weight || 1;

    // Co-occurrence bonus
    const coOccCount = coOccurrences.get(pairKey) || 0;
    strength += coOccCount * 0.3;

    // Temporal recency decay
    let recency = 1;
    const personA = personData.get(nameA);
    const personB = personData.get(nameB);

    if (personA && personB) {
      const lastYear = Math.max(personA.last_year || currentYear, personB.last_year || currentYear);
      const yearsSinceActive = currentYear - lastYear;
      const halfLife = 4;
      recency = Math.pow(0.5, yearsSinceActive / halfLife);
    }

    const decay = 1 + (recency - 1) * 0.2; // Recency contributes 0-20%
    strength *= decay;

    // Mutual friends bonus
    const mutuals = new Set();
    const neighborsA = adjacency.get(nameA);
    const neighborsB = adjacency.get(nameB);

    for (const neighbor of neighborsA) {
      if (neighbor !== nameB && neighborsB.has(neighbor)) {
        mutuals.add(neighbor);
      }
    }

    strength += mutuals.size * 0.1;

    strengthMap.set(pairKey, {
      strength,
      decay,
      recency,
      mutualCount: mutuals.size
    });
  }

  return strengthMap;
}

/**
 * Computes comprehensive network health metrics
 * Measures overall network connectivity, evolution, and activity
 *
 * @param {Array<{name: string}>} nodes
 * @param {Array} links
 * @param {Array} arcData - People with first_year, last_year, category
 * @param {number} currentYear - Current year (default 2026)
 * @returns {{
 *   avgDegree: number,
 *   density: number,
 *   avgClusteringCoeff: number,
 *   giantComponentSize: number,
 *   avgPathLength: number,
 *   networkCentralization: number,
 *   activeRatio: number,
 *   churnRate: number
 * }}
 */
export function computeNetworkHealth(nodes, links, arcData = [], currentYear = 2026) {
  const nodeNames = nodes.map(n => getName(n));
  const n = nodeNames.length;

  if (n === 0) {
    return {
      avgDegree: 0,
      density: 0,
      avgClusteringCoeff: 0,
      giantComponentSize: 0,
      avgPathLength: 0,
      networkCentralization: 0,
      activeRatio: 0,
      churnRate: 0
    };
  }

  const adjacency = buildAdjacencyList(nodes, links);

  // 1. Average degree
  let totalDegree = 0;
  for (const neighbors of adjacency.values()) {
    totalDegree += neighbors.size;
  }
  const avgDegree = totalDegree / n;

  // 2. Density
  const maxEdges = (n * (n - 1)) / 2;
  const actualEdges = totalDegree / 2;
  const density = n > 1 ? actualEdges / maxEdges : 0;

  // 3. Average clustering coefficient
  const clustering = computeClusteringCoeff(nodes, links);
  let sumClustering = 0;
  for (const coeff of clustering.values()) {
    sumClustering += coeff;
  }
  const avgClusteringCoeff = sumClustering / n;

  // 4. Giant component size (using BFS)
  const giantComponentSize = findGiantComponent(adjacency, nodeNames);

  // 5. Average shortest path (sample-based for performance)
  const avgPathLength = estimateAvgShortestPath(adjacency, nodeNames);

  // 6. Network centralization (how star-like)
  const degrees = Array.from(adjacency.values()).map(neighbors => neighbors.size);
  const maxDegree = Math.max(...degrees, 0);
  let centralizationSum = 0;
  for (const degree of degrees) {
    centralizationSum += maxDegree - degree;
  }
  const networkCentralization = n > 1 ? centralizationSum / ((n - 1) * (n - 2)) : 0;

  // 7. Active ratio (nodes active in last 3 years)
  const personMap = new Map();
  for (const person of arcData) {
    const pName = person.name || person.person;
    if (pName) personMap.set(pName, person);
  }

  let activeCount = 0;
  for (const name of nodeNames) {
    const person = personMap.get(name);
    if (person && person.last_year && person.last_year >= currentYear - 3) {
      activeCount++;
    }
  }
  const activeRatio = n > 0 ? activeCount / n : 0;

  // 8. Churn rate (faded out: last_year < currentYear - 5)
  let churnCount = 0;
  for (const name of nodeNames) {
    const person = personMap.get(name);
    if (person && person.last_year && person.last_year < currentYear - 5) {
      churnCount++;
    }
  }
  const churnRate = n > 0 ? churnCount / n : 0;

  return {
    avgDegree,
    density,
    avgClusteringCoeff,
    giantComponentSize,
    avgPathLength,
    networkCentralization,
    activeRatio,
    churnRate
  };
}

/**
 * Finds the size of the largest connected component
 * @private
 */
function findGiantComponent(adjacency, nodeNames) {
  const visited = new Set();
  let maxSize = 0;

  for (const startNode of nodeNames) {
    if (visited.has(startNode)) continue;

    const component = new Set();
    const queue = [startNode];
    visited.add(startNode);
    component.add(startNode);

    while (queue.length > 0) {
      const node = queue.shift();
      for (const neighbor of adjacency.get(node)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          component.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    maxSize = Math.max(maxSize, component.size);
  }

  return maxSize;
}

/**
 * Estimates average shortest path using sampling
 * @private
 */
function estimateAvgShortestPath(adjacency, nodeNames) {
  const n = nodeNames.length;
  if (n < 2) return 0;

  // Sample up to 50 nodes for performance
  const sampleSize = Math.min(50, n);
  const samples = [];
  for (let i = 0; i < sampleSize; i++) {
    samples.push(nodeNames[Math.floor(Math.random() * n)]);
  }

  let totalPathLength = 0;
  let pairCount = 0;

  for (const source of samples) {
    const distance = new Map();
    for (const node of nodeNames) {
      distance.set(node, Infinity);
    }
    distance.set(source, 0);

    const queue = [source];
    while (queue.length > 0) {
      const u = queue.shift();
      for (const v of adjacency.get(u)) {
        if (distance.get(v) === Infinity) {
          distance.set(v, distance.get(u) + 1);
          queue.push(v);
        }
      }
    }

    for (const [target, dist] of distance) {
      if (target !== source && dist !== Infinity) {
        totalPathLength += dist;
        pairCount++;
      }
    }
  }

  return pairCount > 0 ? totalPathLength / pairCount : 0;
}

/**
 * Computes composite person scores based on multiple centrality measures
 * Higher score = more important/influential person
 *
 * @param {Array<{name: string}>} nodes
 * @param {Array} links
 * @param {Map<string, number>} pageRank - From computePageRank
 * @param {Map<string, number>} betweenness - From computeBetweenness
 * @param {Map<string, number>} clustering - From computeClusteringCoeff
 * @param {Array} arcData - People with mention counts and active years
 * @returns {Map<string, {
 *   socialGravity: number,
 *   pageRank: number,
 *   betweenness: number,
 *   clustering: number,
 *   mentions: number,
 *   span: number,
 *   percentile: number
 * }>}
 */
export function computePersonScores(nodes, links, pageRank, betweenness, clustering, arcData = []) {
  const nodeNames = nodes.map(n => getName(n));

  // Build person data map (supports both .name and .person keys)
  const personData = new Map();
  for (const person of arcData) {
    const pName = person.name || person.person;
    if (pName) personData.set(pName, person);
  }

  // Compute mention counts and spans
  const mentionCounts = new Map();
  const activeSpans = new Map();

  for (const name of nodeNames) {
    const person = personData.get(name);
    if (person) {
      const mentions = person.total_mentions || person.mention_count || 0;
      const span = (person.last_year || 2026) - (person.first_year || 2004) + 1;
      mentionCounts.set(name, mentions);
      activeSpans.set(name, span);
    } else {
      mentionCounts.set(name, 0);
      activeSpans.set(name, 1);
    }
  }

  // Normalize all scores
  const normPageRank = normalizeScores(pageRank);
  const normBetweenness = normalizeScores(betweenness);
  const normClustering = normalizeScores(clustering);
  const normMentions = normalizeScores(mentionCounts);
  const normSpan = normalizeScores(activeSpans);

  // Compute composite scores
  const scores = new Map();
  const gravityScores = [];

  for (const name of nodeNames) {
    const pr = normPageRank.get(name) || 0;
    const bet = normBetweenness.get(name) || 0;
    const clust = normClustering.get(name) || 0;
    const ment = normMentions.get(name) || 0;
    const span = normSpan.get(name) || 0;

    const socialGravity = 0.3 * pr + 0.25 * bet + 0.15 * clust + 0.15 * ment + 0.15 * span;

    scores.set(name, {
      socialGravity,
      pageRank: pr,
      betweenness: bet,
      clustering: clust,
      mentions: ment,
      span: span,
      percentile: 0 // Computed after sorting
    });

    gravityScores.push({ name, score: socialGravity });
  }

  // Compute percentiles
  gravityScores.sort((a, b) => a.score - b.score);
  for (let i = 0; i < gravityScores.length; i++) {
    const percentile = (i / Math.max(gravityScores.length - 1, 1)) * 100;
    const score = scores.get(gravityScores[i].name);
    score.percentile = Math.round(percentile);
  }

  return scores;
}

/**
 * Computes temporal evolution of the network year by year
 * Tracks growth, churn, and composition changes
 *
 * @param {Array<{name: string}>} nodes
 * @param {Array} arcData - People with first_year, last_year, category
 * @param {number} currentYear - Current year (default 2026)
 * @returns {Array<{
 *   year: number,
 *   activeCount: number,
 *   newCount: number,
 *   lostCount: number,
 *   networkAge: number,
 *   diversityIndex: number
 * }>}
 */
export function computeTemporalEvolution(nodes, arcData = [], currentYear = 2026) {
  const nodeNames = new Set(nodes.map(n => getName(n)));

  // Build person data map (supports both .name and .person keys)
  const personData = new Map();
  for (const person of arcData) {
    const pName = person.name || person.person;
    if (pName && nodeNames.has(pName)) {
      personData.set(pName, { ...person, name: pName });
    }
  }

  const startYear = 2004;
  const evolution = [];

  for (let year = startYear; year <= currentYear; year++) {
    const activePeople = [];
    let newCount = 0;
    let lostCount = 0;

    for (const [name, person] of personData) {
      const firstYear = person.first_year || startYear;
      const lastYear = person.last_year || currentYear;

      // Active in this year
      if (firstYear <= year && year <= lastYear) {
        activePeople.push(person);

        // New this year
        if (firstYear === year) {
          newCount++;
        }
      }

      // Lost this year (was active last year, not this year)
      if (year > startYear) {
        const prevFirstYear = person.first_year || startYear;
        const prevLastYear = person.last_year || currentYear;

        if (prevFirstYear <= year - 1 && year - 1 <= prevLastYear &&
            !(firstYear <= year && year <= lastYear)) {
          lostCount++;
        }
      }
    }

    // Network age: average years known of active people
    let networkAge = 0;
    if (activePeople.length > 0) {
      for (const person of activePeople) {
        const yearsKnown = year - (person.first_year || startYear) + 1;
        networkAge += yearsKnown;
      }
      networkAge /= activePeople.length;
    }

    // Diversity index: Shannon entropy of category distribution
    let diversityIndex = 0;
    if (activePeople.length > 0) {
      const categoryCount = new Map();
      for (const person of activePeople) {
        const cat = person.category || 'unknown';
        categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
      }

      let entropy = 0;
      for (const count of categoryCount.values()) {
        const p = count / activePeople.length;
        entropy -= p * Math.log2(p);
      }
      diversityIndex = entropy; // Normalized 0 to log2(categories)
    }

    evolution.push({
      year,
      activeCount: activePeople.length,
      newCount,
      lostCount,
      networkAge,
      diversityIndex
    });
  }

  return evolution;
}

/**
 * Analyzes relationship between two specific people
 * Comprehensive pairwise analysis
 *
 * @param {string} nameA
 * @param {string} nameB
 * @param {Array} links
 * @param {Map} coOccurrences - Map of "nameA|nameB" → count
 * @param {Array} arcData - People with temporal data
 * @param {Map<string, number>} pageRank - From computePageRank
 * @returns {{
 *   sharedYearsCount: number,
 *   coOccurrenceCount: number,
 *   mutualFriends: string[],
 *   strengthScore: number,
 *   combinedPageRank: number,
 *   relationship: 'strong'|'moderate'|'weak'|'dormant'
 * }}
 */
export function analyzePair(nameA, nameB, links = [], coOccurrences = new Map(), arcData = [], pageRank = new Map()) {
  let sharedYearsCount = 0;
  let personAData = null;
  let personBData = null;

  for (const person of arcData) {
    const pName = person.name || person.person;
    if (pName === nameA) personAData = person;
    if (pName === nameB) personBData = person;
  }

  // Compute shared active years
  if (personAData && personBData) {
    const startA = personAData.first_year || 2004;
    const endA = personAData.last_year || 2026;
    const startB = personBData.first_year || 2004;
    const endB = personBData.last_year || 2026;

    const overlapStart = Math.max(startA, startB);
    const overlapEnd = Math.min(endA, endB);

    if (overlapStart <= overlapEnd) {
      sharedYearsCount = overlapEnd - overlapStart + 1;
    }
  }

  // Co-occurrence count
  const [name1, name2] = nameA < nameB ? [nameA, nameB] : [nameB, nameA];
  const pairKey = `${name1}|${name2}`;
  const coOccurrenceCount = coOccurrences.get(pairKey) || 0;

  // Mutual friends
  const mutualFriends = [];
  const links1 = new Set();
  const links2 = new Set();

  for (const link of links) {
    const source = typeof link.source === 'string' ? link.source : link.source.name;
    const target = typeof link.target === 'string' ? link.target : link.target.name;

    if (source === nameA) links1.add(target);
    else if (target === nameA) links1.add(source);

    if (source === nameB) links2.add(target);
    else if (target === nameB) links2.add(source);
  }

  for (const friend of links1) {
    if (links2.has(friend) && friend !== nameA && friend !== nameB) {
      mutualFriends.push(friend);
    }
  }

  // Strength score (check if link exists)
  let strengthScore = 0;
  for (const link of links) {
    const source = typeof link.source === 'string' ? link.source : link.source.name;
    const target = typeof link.target === 'string' ? link.target : link.target.name;

    if ((source === nameA && target === nameB) || (source === nameB && target === nameA)) {
      strengthScore = link.weight || 1;
      break;
    }
  }

  // Add co-occurrence and mutual bonus
  strengthScore += coOccurrenceCount * 0.3 + mutualFriends.length * 0.1;

  // Combined PageRank
  const prA = pageRank.get(nameA) || 0;
  const prB = pageRank.get(nameB) || 0;
  const combinedPageRank = prA + prB;

  // Determine relationship type
  let relationship = 'dormant';
  if (strengthScore > 2) relationship = 'strong';
  else if (strengthScore > 1) relationship = 'moderate';
  else if (strengthScore > 0) relationship = 'weak';

  return {
    sharedYearsCount,
    coOccurrenceCount,
    mutualFriends,
    strengthScore,
    combinedPageRank,
    relationship
  };
}
