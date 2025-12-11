/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export type OptionVariant<Key, Base, RequiredKey extends keyof Base> = {
  type: Key;
} & Pick<Base, RequiredKey> & {
    [OtherKey in Exclude<keyof Base, RequiredKey>]?: undefined;
  };
