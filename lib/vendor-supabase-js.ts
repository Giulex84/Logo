export type SupabaseClientOptions = {
  auth?: {
    autoRefreshToken?: boolean;
    persistSession?: boolean;
  };
};

export type SupabaseResponse<T> = {
  data: T | null;
  error: { message: string } | null;
};

type OrderOptions = { ascending?: boolean };

type MutationOptions = { onConflict?: string };

type FetchConfig = {
  url: string;
  key: string;
  table: string;
};

async function handleResponse<T>(response: Response): Promise<SupabaseResponse<T>> {
  if (!response.ok) {
    const message = await response.text();
    return { data: null, error: { message: message || "Request failed" } };
  }

  try {
    const payload = (await response.json()) as T;
    return { data: payload, error: null };
  } catch {
    return { data: null, error: { message: "Invalid JSON response" } };
  }
}

class SupabaseSelectQuery<T> implements PromiseLike<SupabaseResponse<T[]>> {
  private params = new URLSearchParams();

  constructor(private readonly config: FetchConfig, columns: string) {
    this.params.set("select", columns);
  }

  eq(column: string, value: string | number): this {
    this.params.set(column, `eq.${value}`);
    return this;
  }

  order(column: string, options?: OrderOptions): this {
    const direction = options?.ascending === false ? "desc" : "asc";
    this.params.append("order", `${column}.${direction}`);
    return this;
  }

  async execute(): Promise<SupabaseResponse<T[]>> {
    const url = `${this.config.url}/rest/v1/${this.config.table}?${this.params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: this.config.key,
        Authorization: `Bearer ${this.config.key}`,
        "Content-Type": "application/json"
      }
    });

    return handleResponse<T[]>(response);
  }

  then<TResult1 = SupabaseResponse<T[]>, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResponse<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

async function performMutation<T>(config: FetchConfig, values: unknown, prefer: string, options?: MutationOptions) {
  const searchParams = new URLSearchParams();

  if (options?.onConflict) {
    searchParams.set("on_conflict", options.onConflict);
  }

  const url = `${config.url}/rest/v1/${config.table}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: prefer
    },
    body: JSON.stringify(Array.isArray(values) ? values : [values])
  });

  return handleResponse<T[]>(response);
}

class SupabaseTable<T> {
  constructor(private readonly config: FetchConfig) {}

  select(columns = "*") {
    return new SupabaseSelectQuery<T>(this.config, columns);
  }

  insert(values: unknown) {
    return performMutation<T>(this.config, values, "return=representation");
  }

  upsert(values: unknown, options?: MutationOptions) {
    return performMutation<T>(
      this.config,
      values,
      "return=representation,resolution=merge-duplicates",
      options
    );
  }
}

class SupabaseClient {
  constructor(private readonly url: string, private readonly key: string) {}

  from<T>(table: string) {
    return new SupabaseTable<T>({ url: this.url, key: this.key, table });
  }
}

export function createClient(url: string, key: string, _options?: SupabaseClientOptions) {
  return new SupabaseClient(url, key);
}
