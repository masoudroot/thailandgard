declare module "@prisma/composer-prisma-cloud" {
  export function compute(config: unknown): any;
}

declare module "@prisma/composer-prisma-cloud/control" {
  export function prismaCloud(config: { region: string }): any;
  export function prismaState(): any;
}
