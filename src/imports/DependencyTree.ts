export class DependencyTree {
  private nodes: {[uri: string]: string} = {};
  private edges: {[uri: string]: string[]} = {};

  addNode(uri: string, schema: string) {
    this.nodes[uri] = schema;
    this.edges[uri] = [];
  }

  addEdge(fromUri: string, toUri: string) {
    this.edges[fromUri].push(toUri);
  }

  hasNode(uri: string) {
    return this.nodes.hasOwnProperty(uri);
  }

  getNodeProperties(uri: string) {
    return this.nodes[uri];
  }

  getNodeDependencies(uri: string) {
    return this.edges[uri];
  }

  getAllDependencies(uris: string[]): string[] {
    const visited = new Set<string>();
    const queue = [...uris];
    while (queue.length > 0) {
      const uri = queue.shift();
      if (uri && !visited.has(uri)) {
        visited.add(uri);
        const dependencies = this.getNodeDependencies(uri);
        queue.push(...dependencies);
      }
    }
    return Array.from(visited);
  }
}