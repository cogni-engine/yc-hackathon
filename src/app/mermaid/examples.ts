export interface MermaidExample {
  id: string;
  title: string;
  blurb: string;
  /** Marks diagram types Mermaid still labels experimental. */
  beta?: boolean;
  code: string;
}

export interface MermaidCategory {
  id: string;
  title: string;
  examples: MermaidExample[];
}

/**
 * A tour of what Mermaid 11 can render. Every block is real, editable Mermaid
 * source — the same renderer used by the note editor draws these, so anything
 * here works inside a ```mermaid code block too.
 */
export const MERMAID_CATEGORIES: MermaidCategory[] = [
  {
    id: 'flow',
    title: 'Flow & process',
    examples: [
      {
        id: 'flowchart',
        title: 'Flowchart',
        blurb: 'Nodes, decisions and edges — the workhorse diagram.',
        code: `flowchart TD
    A([Start]) --> B{Valid syntax?}
    B -->|Yes| C[Render SVG]
    B -->|No| D[Show source]
    C --> E[(Sanitize)]
    E --> F([Display])
    D --> F
    subgraph editor [Editor loop]
      B
      C
    end`,
      },
      {
        id: 'state',
        title: 'State diagram',
        blurb: 'Finite-state machines with nested and composite states.',
        code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : render()
    Loading --> Success : valid
    Loading --> Error : parse fail
    Success --> Idle : edit
    Error --> Idle : edit
    Success --> [*]`,
      },
      {
        id: 'journey',
        title: 'User journey',
        blurb: 'Map a workflow with per-step satisfaction scores.',
        code: `journey
    title Writing a note
    section Draft
      Open editor: 5: Me
      Slash command: 4: Me
    section Diagram
      Insert mermaid: 3: Me
      Fix syntax: 2: Me
    section Publish
      Share link: 5: Me, Team`,
      },
    ],
  },
  {
    id: 'interaction',
    title: 'Interaction',
    examples: [
      {
        id: 'sequence',
        title: 'Sequence diagram',
        blurb: 'Actors, messages, activations, notes and loops over time.',
        code: `sequenceDiagram
    autonumber
    actor User
    participant App
    participant API
    participant DB
    User->>App: Click "Save"
    App->>API: POST /notes
    API->>DB: INSERT row
    DB-->>API: ok
    API-->>App: 201 Created
    App-->>User: Saved ✓
    Note over App,API: Debounced 300ms`,
      },
    ],
  },
  {
    id: 'structure',
    title: 'Structure & data',
    examples: [
      {
        id: 'class',
        title: 'Class diagram',
        blurb: 'Types, fields, methods and relationships (UML).',
        code: `classDiagram
    class Note {
      +string id
      +string title
      +render() void
    }
    class MermaidBlock {
      +string code
      +parse() bool
    }
    Note "1" o-- "many" MermaidBlock : contains
    MermaidBlock <|-- FlowchartBlock
    MermaidBlock <|-- SequenceBlock`,
      },
      {
        id: 'er',
        title: 'Entity relationship',
        blurb: 'Tables, keys and cardinality for data models.',
        code: `erDiagram
    USER ||--o{ NOTE : writes
    NOTE ||--o{ BLOCK : contains
    BLOCK }o--|| BLOCK_TYPE : "is a"
    USER {
      uuid id PK
      string email
    }
    NOTE {
      uuid id PK
      uuid author FK
      string title
    }`,
      },
      {
        id: 'requirement',
        title: 'Requirement diagram',
        blurb: 'Requirements, elements and satisfies/verifies links.',
        code: `requirementDiagram
    requirement theme_req {
      id: 1
      text: Diagrams match the app theme
      risk: medium
      verifymethod: test
    }
    element renderer {
      type: component
    }
    renderer - satisfies -> theme_req`,
      },
      {
        id: 'c4',
        title: 'C4 context',
        blurb: 'Software architecture at the system-context level.',
        code: `C4Context
    title System context
    Person(user, "User", "Writes notes")
    System(app, "Pillow", "Collaborative editor")
    System_Ext(mermaid, "Mermaid", "Diagram renderer")
    Rel(user, app, "Uses")
    Rel(app, mermaid, "Renders with")`,
      },
      {
        id: 'block',
        title: 'Block diagram',
        blurb: 'Free-form blocks laid out on a column grid.',
        beta: true,
        code: `block-beta
    columns 3
    a["Code"] b["Parser"] c["SVG"]
    a --> b
    b --> c
    space:3
    d["DOMPurify"]:3`,
      },
      {
        id: 'architecture',
        title: 'Architecture',
        blurb: 'Cloud services, groups and their connections.',
        beta: true,
        code: `architecture-beta
    group api(cloud)[API]
    service db(database)[DB] in api
    service server(server)[Server] in api
    service editor(internet)[Editor]
    editor:R --> L:server
    server:B --> T:db`,
      },
      {
        id: 'packet',
        title: 'Packet diagram',
        blurb: 'Byte/bit layout of a network packet or binary format.',
        beta: true,
        code: `packet-beta
    0-15: "Source Port"
    16-31: "Destination Port"
    32-63: "Sequence Number"
    64-95: "Acknowledgment Number"
    96-99: "Data Offset"
    100-105: "Reserved"
    106-111: "Flags"
    112-127: "Window"`,
      },
    ],
  },
  {
    id: 'planning',
    title: 'Planning & knowledge',
    examples: [
      {
        id: 'gantt',
        title: 'Gantt chart',
        blurb: 'Tasks, dependencies and milestones on a timeline.',
        code: `gantt
    title Hackathon plan
    dateFormat YYYY-MM-DD
    axisFormat %m/%d
    section Build
      Theme    :done, t1, 2026-07-01, 2d
      Gallery  :active, t2, after t1, 2d
    section Polish
      QA       :t3, after t2, 1d
      Demo     :milestone, m1, after t3, 0d`,
      },
      {
        id: 'kanban',
        title: 'Kanban board',
        blurb: 'Columns of cards for tracking work in progress.',
        beta: true,
        code: `kanban
    todo[Todo]
      t1[Design theme]
      t2[Write examples]
    doing[In Progress]
      t3[Build gallery]
    done[Done]
      t4[Research API]`,
      },
      {
        id: 'timeline',
        title: 'Timeline',
        blurb: 'Chronological events grouped by period.',
        code: `timeline
    title Project timeline
    2026 Q1 : Kickoff : Design
    2026 Q2 : Editor : Collaboration
    2026 Q3 : Diagrams : Launch`,
      },
      {
        id: 'mindmap',
        title: 'Mind map',
        blurb: 'Radial hierarchy of ideas from a central node.',
        code: `mindmap
  root((Mermaid))
    Diagrams
      Flowchart
      Sequence
      Class
    Styling
      Themes
      Hand-drawn
    Integration
      TipTap
      Notes`,
      },
    ],
  },
  {
    id: 'charts',
    title: 'Charts & analysis',
    examples: [
      {
        id: 'pie',
        title: 'Pie chart',
        blurb: 'Proportional slices with optional data labels.',
        code: `pie showData
    title Diagram types used
    "Flowchart" : 42
    "Sequence" : 25
    "Class" : 15
    "Other" : 18`,
      },
      {
        id: 'xychart',
        title: 'XY chart',
        blurb: 'Bar and line series on shared x/y axes.',
        beta: true,
        code: `xychart-beta
    title "Weekly renders"
    x-axis [Mon, Tue, Wed, Thu, Fri]
    y-axis "Count" 0 --> 100
    bar [30, 55, 40, 80, 65]
    line [30, 55, 40, 80, 65]`,
      },
      {
        id: 'quadrant',
        title: 'Quadrant chart',
        blurb: 'Plot items across two axes into four quadrants.',
        code: `quadrantChart
    title Effort vs Impact
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    quadrant-1 Do now
    quadrant-2 Plan
    quadrant-3 Skip
    quadrant-4 Quick wins
    Theme fix: [0.3, 0.8]
    Gallery: [0.6, 0.7]
    Docs: [0.4, 0.3]`,
      },
      {
        id: 'radar',
        title: 'Radar chart',
        blurb: 'Compare multiple metrics on radial axes.',
        beta: true,
        code: `radar-beta
    title Team skills
    axis design["Design"], build["Build"], test["Test"]
    axis docs["Docs"], demo["Demo"]
    curve team["This team"]{4, 5, 3, 2, 5}
    max 5
    min 0`,
      },
      {
        id: 'sankey',
        title: 'Sankey diagram',
        blurb: 'Weighted flows between stages (source, target, value).',
        beta: true,
        code: `sankey-beta
    Ideas,Prototypes,20
    Ideas,Dropped,10
    Prototypes,Shipped,12
    Prototypes,Backlog,8`,
      },
    ],
  },
  {
    id: 'vcs',
    title: 'Version control',
    examples: [
      {
        id: 'gitgraph',
        title: 'Git graph',
        blurb: 'Commits, branches, merges and tags.',
        code: `gitGraph
    commit id: "init"
    branch feature
    checkout feature
    commit id: "theme"
    commit id: "gallery"
    checkout main
    merge feature tag: "v1.0"
    commit id: "polish"`,
      },
    ],
  },
];
