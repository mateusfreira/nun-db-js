interface NunDbOptions {
  url: string;
  db: string;
  user?: string;
  pwd?: string;
  token?: string;
}

interface SetValueResult<T = any> {
  _id: number;
  value: T;
}

interface GetValueResult<T = any> {
  value: T;
  version: number;
}

type WatchCallback<T = any> = (result: { name: string; value: T; version: number; pedding?: boolean }) => void;

declare class NunDb {
  constructor(options: NunDbOptions);
  constructor(url: string, user: string, pwd: string, db?: string, token?: string);

  connect(): Promise<void>;
  goOffline(): void;
  goOnline(): void;

  setValue<T = any>(key: string, value: T): Promise<SetValueResult<T>>;
  set<T = any>(key: string, value: T): Promise<SetValueResult<T>>;
  setValueSafe<T = any>(key: string, value: T, version?: number, basicType?: boolean): Promise<SetValueResult<T>>;
  increment(key: string, value?: number | string): Promise<void>;
  remove(key: string): Promise<void>;

  createDb(name: string, token: string): Promise<void>;
  useDb(db: string, token: string, user?: string): Promise<void>;
  auth(user: string, pwd: string): void;

  get<T = any>(key: string): Promise<GetValueResult<T>>;
  getValue<T = any>(key: string): Promise<T>;
  getValueSafe<T = any>(key: string): Promise<GetValueResult<T>>;
  keys(prefix?: string): Promise<string[]>;

  watch<T = any>(
    key: string,
    callback: WatchCallback<T>,
    currentValue?: boolean,
    useLocalValue?: boolean
  ): Promise<void>;

  becameArbiter(
    resolveCallback: (conflict: {
      opp_id: string;
      db: string;
      version: number;
      key: string;
      values: any[];
    }) => Promise<any> | any
  ): Promise<void>;

  _setLoggers(logger: { log: Function; error: Function }): void;
}

export = NunDb;
