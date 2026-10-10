declare module 'drawflow' {
  export interface DrawflowConnection {
    node: string;
    output?: string;
    input?: string;
  }

  export interface DrawflowPort {
    connections: DrawflowConnection[];
  }

  export interface DrawflowNode<T = Record<string, unknown>> {
    id: number;
    name: string;
    data: T;
    class: string;
    html: string;
    typenode: boolean | string;
    inputs: Record<string, DrawflowPort>;
    outputs: Record<string, DrawflowPort>;
    pos_x: number;
    pos_y: number;
  }

  export interface DrawflowExportData {
    drawflow: {
      Home: {
        data: Record<string, DrawflowNode>;
      };
      [moduleName: string]: {
        data: Record<string, DrawflowNode>;
      };
    };
  }

  export default class Drawflow {
    container: HTMLElement;
    events: Record<string, unknown>;
    module: string;
    editor_mode: string;
    drag: boolean;
    drag_point: boolean;
    editor_selected: boolean;
    node_selected: HTMLElement | null;
    connection_selected: HTMLElement | null;
    pos_x: number;
    pos_y: number;
    pos_x_start: number;
    pos_y_start: number;
    mouse_x: number;
    mouse_y: number;
    line_path: number;
    first_click: HTMLElement | null;
    force_first_click: boolean;
    canvas_x: number;
    canvas_y: number;
    zoom: number;
    zoom_max: number;
    zoom_min: number;
    zoom_value: number;
    zoom_last_value: number;
    draggable_inputs: boolean;
    useuuid: boolean;
    reroute: boolean;
    reroute_fix_curvature: boolean;
    curvature: number;
    reroute_curvature_start_end: number;
    reroute_curvature: number;
    drawflow: DrawflowExportData;

    constructor(container: HTMLElement, render?: unknown, parent?: unknown);

    start(): void;
    import(data: DrawflowExportData | unknown): void;
    export(): DrawflowExportData;
    clear(): void;
    clearModuleSelected(): void;
    addNode(
      name: string,
      inputs: number,
      outputs: number,
      posx: number,
      posy: number,
      classname: string,
      data: unknown,
      html: string,
      typenode?: boolean | string
    ): number;
    addConnection(
      id_output: string | number,
      id_input: string | number,
      output_class: string,
      input_class: string
    ): void;
    removeNodeId(nodeId: string | number): void;
    removeConnection(): void;
    removeSingleConnection(
      id_output: string | number,
      id_input: string | number,
      output_class: string,
      input_class: string
    ): boolean;
    updateNodeDataFromId(id: string | number, data: unknown): void;
    updateConnectionNodes(id: string | number): void;
    zoom_in(): void;
    zoom_out(): void;
    zoom_reset(): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
    removeListener(event: string, callback: (...args: unknown[]) => void): void;
    changeModule(moduleName: string): void;
    removeModule(moduleName: string): void;
    clearModule(moduleName: string): void;
  }
}
