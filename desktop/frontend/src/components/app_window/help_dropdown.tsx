import { Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-components';
import React from 'react';

export default function HelpDropDown() {
  return (
    <Menu>
      <MenuTrigger>
        <span
          className="ml-6"
          style={{
            lineHeight: '30px'
          }}
        >
          帮助
        </span>
      </MenuTrigger>

      <MenuPopover>
        <MenuList>
          <MenuItem>复制 Token</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
