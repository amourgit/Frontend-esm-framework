export interface PackageJson {
  name: string;
  version?: string;
  browser?: string;
  module?: string;
  main?: string;
  workspaces?: Array<string> | { packages: Array<string> };
  'egen:develop'?: {
    command: string;
    url?: string;
    host?: string;
  };
}
