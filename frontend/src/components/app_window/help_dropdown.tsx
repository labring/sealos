import { Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-components';
import React from 'react';
import useSessionStore from 'stores/session';

export default function HelpDropDown() {
  const getKubeconfigToken = useSessionStore((s) => s.getKubeconfigToken);

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
          <MenuItem
            onClick={() => {
              window.navigator.clipboard.writeText(getKubeconfigToken());
              setTimeout(() => {
                alert('复制成功');
              }, 100);
            }}
          >
            复制 Token
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
