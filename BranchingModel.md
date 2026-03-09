```mermaid
flowchart TD

    %% --- Branch Groups ---
    subgraph FeatureBranches[Feature Branches]
        F1[feature/*]
        F2[feature/*]
        F3[feature/*]
    end

    subgraph DevBranch[Development Branch]
        D[dev]
    end

    subgraph RCBranches[Release Candidate Branches<br>(Created by Promotion Workflow)]
        RC1[rc/<version>]
    end

    subgraph MainBranch[Stable Release Branch]
        M[main]
    end

    subgraph HotfixBranches[Hotfix Branches]
        H1[hotfix/*]
    end

    %% --- Feature → Dev ---
    F1 -->|PR → dev| D
    F2 -->|PR → dev| D
    F3 -->|PR → dev| D

    %% --- Hotfix → Dev (always merged into dev) ---
    H1 -->|PR → dev| D

    %% --- Dev → RC (Promotion Workflow) ---
    D -->|Promote Workflow<br>creates rc/<version>| RC1

    %% --- RC → Main (Approved RC via PR) ---
    RC1 -->|PR → main| M

    %% --- Hotfix → RC (if bug exists in RC) ---
    H1 -->|PR → rc/<version>| RC1

    %% --- Hotfix → Main (if bug exists in Main) ---
    H1 -->|PR → main| M

    %% --- Stable Release Tag ---
    M -->|tag v14.0.X| M
```
