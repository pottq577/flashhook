import "react";

declare module "react" {
  export function useEffectEvent<Args extends unknown[], Return>(
    callback: (...args: Args) => Return
  ): (...args: Args) => Return;
}
