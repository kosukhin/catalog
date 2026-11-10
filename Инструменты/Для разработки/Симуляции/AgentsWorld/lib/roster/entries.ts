export interface RosterEntry {
    readonly id: string;
    readonly type: string;
}

export interface RosterReport {
    readonly types: readonly string[];
    readonly ids: readonly string[];
}

export interface RosterUpdate {
    readonly agents: readonly RosterEntry[];
}

export function labelOf(types: readonly string[]): string {
    return types.length === 0 ? 'все' : types.join(', ');
}

export function matches(entries: ReadonlyMap<string, string>, types: readonly string[]): RosterEntry[] {
    const all = [...entries.entries()].map(([id, type]) => ({ id, type }));
    return types.length === 0 ? all : all.filter((entry) => types.includes(entry.type));
}
