export type PhysicsFetcher = (url: string) => Promise<{ readonly json: () => Promise<unknown> }>;

export async function defaultFetcher(url: string): Promise<{ readonly json: () => Promise<unknown> }> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response;
}


